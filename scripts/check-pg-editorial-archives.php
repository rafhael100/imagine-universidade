<?php

declare(strict_types=1);

/** Actual archived-content repository on isolated CI PostgreSQL, before seeding. */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

foreach ([
    'CI' => 'true', 'GITHUB_ACTIONS' => 'true',
    'GITHUB_REPOSITORY' => 'rafhael100/imagine-universidade',
    'APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432', 'DB_DATABASE' => 'uni_ci',
    'DB_USERNAME' => 'uni_ci', 'DB_PASSWORD' => 'synthetic_ci_only',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "HOLD editorial archives PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD editorial archives PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD editorial archives PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD editorial archives PG: pdo_pgsql required.\n");
    exit(2);
}

function archivesPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Editorial archive check failed.');
    }
    echo 'PASS editorial archives PG: '.$label.PHP_EOL;
}

$stage = 'bootstrap';
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $config = $app->make('config');
    archivesPgCheck($config->get('database.default') === 'pgsql'
        && empty($config->get('database.connections.pgsql.url'))
        && $config->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $config->get('database.connections.pgsql.port') === '5432'
        && $config->get('database.connections.pgsql.database') === 'uni_ci'
        && $config->get('database.connections.pgsql.username') === 'uni_ci'
        && $config->get('database.connections.pgsql.password') === 'synthetic_ci_only',
        'effective Laravel connection is the fixed disposable PostgreSQL laboratory');
    $keys = ['imagine-editorial', 'qa-archive-client'];
    $stage = 'fixture_guard';
    archivesPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'fixtures precede editorial seeding and never overwrite existing organizations');
    $repository = $app->make(UniversityCatalogRepository::class);
    $grant = PortalGrant::allow('imagine-editorial', 'qa-archive-editor', PortalAccessGate::MANAGE, 1, time() + 60);
    archivesPgCheck($repository->archivedVersions($grant, 1) === 'temporarily_unavailable',
        'missing editorial organization is unavailable rather than empty history');

    DB::beginTransaction();
    try {
        $stage = 'fixtures';
        $organizations = [];
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $newCourse = static function (int $org, string $slug, bool $shared = true): int {
            return (int) DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org, 'slug' => $slug,
                'title' => 'CURRENT COURSE METADATA', 'summary' => 'CURRENT SUMMARY', 'category' => 'negocios',
                'is_shared' => $shared, 'is_published' => false, 'created_at' => now(), 'updated_at' => now(),
            ]);
        };
        $newVersion = static function (int $course, int $number, string $status, int $count): array {
            $id = (int) DB::table('educational_course_versions')->insertGetId([
                'educational_course_id' => $course, 'version' => $number, 'status' => $status,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $lessons = [];
            for ($index = 0; $index < $count; $index++) {
                $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                    'educational_course_version_id' => $id, 'slug' => 'lesson-'.$index,
                    'title' => 'Historic lesson '.$index, 'body' => 'Exact historical body '.$number.'.',
                    'sort_order' => intdiv($index, 4), 'is_published' => $status === 'published',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return ['id' => $id, 'lessons' => $lessons];
        };
        $course = $newCourse($organizations['imagine-editorial'], 'qa-editorial-archives');
        $empty = $newCourse($organizations['imagine-editorial'], 'qa-empty-archives');
        $foreign = $newCourse($organizations['qa-archive-client'], 'qa-foreign-archives');
        $private = $newCourse($organizations['imagine-editorial'], 'qa-private-archives', false);
        $oldest = null;
        $largest = null;
        for ($number = 1; $number <= 55; $number++) {
            $version = $newVersion($course, $number, 'archived', $number === 55 ? 55 : ($number === 1 ? 1 : 0));
            if ($number === 1) {
                $oldest = $version;
            }
            if ($number === 55) {
                $largest = $version;
            }
        }
        $draft = $newVersion($course, 56, 'draft', 1);
        $foreignVersion = $newVersion($foreign, 1, 'archived', 1);
        $privateVersion = $newVersion($private, 1, 'archived', 1);
        $unicodeTitle = str_repeat('🌱', 200);
        $unicodeBody = str_repeat('🌱', 30000);
        DB::table('educational_lessons')->where('id', $largest['lessons'][0])
            ->update(['title' => $unicodeTitle, 'body' => $unicodeBody]);

        $reading = true;
        $indicesOnly = true;
        $unexpected = [];
        $indexBodies = [];
        DB::listen(static function (QueryExecuted $query) use (&$reading, &$indicesOnly, &$unexpected, &$indexBodies): void {
            if (!$reading) {
                return;
            }
            if (preg_match('/^\s*(insert|update|delete|create|alter|drop)/i', $query->sql)
                || preg_match('/educational_(lesson_progress|course_favorites|reading_positions|audit_events)/', $query->sql)) {
                $unexpected[] = true;
            }
            if ($indicesOnly && str_contains($query->sql, 'educational_lessons') && str_contains($query->sql, 'body')) {
                $indexBodies[] = true;
            }
        });
        $stage = 'version_pages';
        $none = $repository->archivedVersions($grant, $empty);
        archivesPgCheck(is_array($none) && $none['versions'] === [] && $none['next_before_version'] === null,
            'an existing course without archives has a valid empty index');
        $first = $repository->archivedVersions($grant, $course);
        $last = $repository->archivedVersions($grant, $course, 6);
        archivesPgCheck(is_array($first) && count($first['versions']) === 50 && $first['next_before_version'] === 6
            && array_column($first['versions'], 'version') === range(55, 6)
            && $first['versions'][0]['lesson_count'] === 55
            && is_array($last) && array_column($last['versions'], 'version') === range(5, 1)
            && $last['next_before_version'] === null,
            'version pages use exact archived numbers, per-version counts and a 51st-row sentinel');
        archivesPgCheck(!str_contains(json_encode($first, JSON_THROW_ON_ERROR), 'CURRENT')
            && !array_key_exists('title', $first) && !array_key_exists('summary', $first),
            'current global course metadata is never presented as a historical snapshot');

        $stage = 'lesson_pages';
        $lessons = $repository->archivedLessons($grant, $course, 55);
        $tail = $repository->archivedLessons($grant, $course, 55, 12, $largest['lessons'][49]);
        archivesPgCheck(is_array($lessons) && count($lessons['lessons']) === 50
            && $lessons['next_after'] === ['sort_order' => 12, 'lesson_id' => $largest['lessons'][49]]
            && is_array($tail) && count($tail['lessons']) === 5 && $tail['next_after'] === null
            && array_column([...$lessons['lessons'], ...$tail['lessons']], 'id') === $largest['lessons'],
            'tuple cursors preserve equal-order ties and every lesson across PostgreSQL pages');
        archivesPgCheck($indexBodies === [] && !array_key_exists('body', $lessons['lessons'][0]),
            'both metadata indices omit full lesson bodies from SQL and DTOs');

        $stage = 'exact_detail';
        $indicesOnly = false;
        $detail = $repository->archivedLesson($grant, $course, 55, $largest['lessons'][0]);
        archivesPgCheck(is_array($detail) && $detail['course_id'] === $course && $detail['course_version'] === 55
            && $detail['status'] === 'archived' && $detail['lesson']['title'] === $unicodeTitle
            && $detail['lesson']['body'] === $unicodeBody,
            'one exact historical body preserves the full permitted UTF-8 codepoint range');
        archivesPgCheck($repository->archivedLesson($grant, $course, 1, $largest['lessons'][0]) === 'not_found'
            && $repository->archivedLesson($grant, $course, 55, $oldest['lessons'][0]) === 'not_found'
            && $repository->archivedLessons($grant, $course, 56) === 'not_found'
            && $repository->archivedLesson($grant, $course, 56, $draft['lessons'][0]) === 'not_found',
            'course, version number, archived status and lesson must all match');

        $stage = 'cursor_and_scope';
        archivesPgCheck($repository->archivedVersions($grant, $course, 56) === 'invalid_cursor'
            && $repository->archivedLessons($grant, $course, 55, 0, $oldest['lessons'][0]) === 'invalid_cursor'
            && $repository->archivedLessons($grant, $course, 55, 13, $largest['lessons'][49]) === 'invalid_cursor',
            'cursor anchors must belong to the exact archived course and version');
        archivesPgCheck($repository->archivedVersions($grant, $course, 2147483648) === 'invalid_cursor'
            && $repository->archivedLessons($grant, $course, 2147483648) === 'not_found'
            && $repository->archivedLesson($grant, $course, 2147483648, $largest['lessons'][0]) === 'not_found'
            && $repository->archivedLessons($grant, $course, 55, 2147483648, $largest['lessons'][0]) === 'invalid_cursor',
            'bigint-bound safe inputs beyond int4 yield absence or invalid cursor, never SQL overflow');
        foreach ([[$foreign, $foreignVersion], [$private, $privateVersion]] as [$deniedCourse, $deniedVersion]) {
            archivesPgCheck($repository->archivedVersions($grant, $deniedCourse) === 'not_found'
                && $repository->archivedLessons($grant, $deniedCourse, 1) === 'not_found'
                && $repository->archivedLesson($grant, $deniedCourse, 1, $deniedVersion['lessons'][0]) === 'not_found',
                'foreign and nonshared courses stay outside the editorial archive');
        }
        $client = PortalGrant::allow('qa-archive-client', 'manager', PortalAccessGate::MANAGE, 1, time() + 30);
        archivesPgCheck($repository->archivedVersions($client, $course) === 'access_denied'
            && $repository->archivedVersions(PortalGrant::deny(), $course) === 'access_denied',
            'MANAGE on a client company and denied grants never authorize editorial history');
        archivesPgCheck($unexpected === [], 'history reads perform only editorial SELECTs without personal learning or audit tables');
        $reading = false;
    } finally {
        DB::rollBack();
    }
    archivesPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'all fixture organizations and their content were rolled back');
    echo "PASS editorial archives PG: actual repository, scoped pages, historical detail and readonly boundaries.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'FAIL editorial archives PG at '.$stage.' ('.get_class($error).").\n");
    exit(1);
}
