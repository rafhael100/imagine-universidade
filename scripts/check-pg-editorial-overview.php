<?php

declare(strict_types=1);

/**
 * C-119: actual aggregate repository on disposable PostgreSQL, before seeding.
 * Fixture rows belong to one transaction and are always rolled back. No
 * HTTP authentication, operational database, migration or role changes.
 */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

foreach ([
    'CI' => 'true', 'GITHUB_ACTIONS' => 'true',
    'GITHUB_REPOSITORY' => 'rafhael100/imagine-universidade',
    'APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci', 'DB_USERNAME' => 'uni_ci', 'DB_PASSWORD' => 'synthetic_ci_only',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "HOLD editorial overview PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD editorial overview PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD editorial overview PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD editorial overview PG: pdo_pgsql required.\n");
    exit(2);
}

function overviewPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Editorial overview check failed.');
    }
    echo 'PASS editorial overview PG: '.$label.PHP_EOL;
}

$stage = 'bootstrap';
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $configuration = $app->make('config');
    overviewPgCheck($configuration->get('database.default') === 'pgsql'
        && empty($configuration->get('database.connections.pgsql.url'))
        && $configuration->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $configuration->get('database.connections.pgsql.port') === '5432'
        && $configuration->get('database.connections.pgsql.database') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.username') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.password') === 'synthetic_ci_only',
        'effective Laravel connection is the fixed local PostgreSQL laboratory');
    $repository = $app->make(UniversityCatalogRepository::class);
    $grant = PortalGrant::allow('imagine-editorial', 'qa-overview-editor', PortalAccessGate::MANAGE, 1, time() + 30);
    $keys = ['imagine-editorial', 'qa-overview-client'];
    $stage = 'fixture_guard';
    overviewPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'fixtures run before editorial seeding and never overwrite existing organizations');
    overviewPgCheck($repository->adminOverview($grant) === null,
        'missing editorial organization is unavailable rather than a zero snapshot');

    DB::beginTransaction();
    try {
        $stage = 'fixtures';
        $organizations = [];
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $empty = $repository->adminOverview($grant);
        overviewPgCheck($empty !== null && $empty['totals'] === [
            'courses' => 0, 'published_courses' => 0, 'draft_courses' => 0,
            'current_lessons' => 0, 'courses_without_lessons' => 0, 'courses_without_summary' => 0,
        ] && array_column($empty['categories'], 'category') === ['metodologia', 'negocios', 'sistemas'],
            'an actual empty editorial catalog has fixed zero categories');

        $newCourse = static function (int $org, string $slug, string $category, ?string $summary,
            bool $published, bool $shared = true): int {
            return (int) DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org, 'slug' => $slug, 'title' => 'Curso sintético de overview',
                'category' => $category, 'summary' => $summary, 'is_published' => $published, 'is_shared' => $shared,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        };
        $newVersion = static function (int $course, int $number, string $status, int $lessonCount): void {
            $version = (int) DB::table('educational_course_versions')->insertGetId([
                'educational_course_id' => $course, 'version' => $number, 'status' => $status,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            for ($i = 1; $i <= $lessonCount; $i++) {
                DB::table('educational_lessons')->insert([
                    'educational_course_version_id' => $version, 'slug' => 'synthetic-lesson-'.$i,
                    'title' => 'Aula sintética', 'body' => 'Conteúdo sintético da verificação agregada.',
                    'is_published' => $status === 'published', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        };
        $editorial = $organizations['imagine-editorial'];
        $published = $newCourse($editorial, 'qa-overview-published', 'metodologia', 'Resumo', true);
        $newVersion($published, 3, 'published', 2);
        $newVersion($published, 1, 'archived', 4);
        $newVersion($published, 2, 'archived', 3);
        $emptyCourse = $newCourse($editorial, 'qa-overview-empty', 'negocios', " \t\n\r\v ", false);
        $draft = $newCourse($editorial, 'qa-overview-draft', 'sistemas', null, false);
        $newVersion($draft, 2, 'draft', 1);
        $newVersion($draft, 1, 'archived', 7);
        $private = $newCourse($editorial, 'qa-overview-private', 'sistemas', null, false, false);
        $newVersion($private, 1, 'draft', 5);
        $foreign = $newCourse($organizations['qa-overview-client'], 'qa-overview-foreign', 'metodologia', null, true);
        $newVersion($foreign, 1, 'published', 6);

        $stage = 'aggregate';
        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $overview = $repository->adminOverview($grant);
            $queries = DB::getQueryLog();
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
        overviewPgCheck($overview !== null && $overview['totals'] === [
            'courses' => 3, 'published_courses' => 1, 'draft_courses' => 2,
            'current_lessons' => 3, 'courses_without_lessons' => 1, 'courses_without_summary' => 2,
        ], 'PostgreSQL booleans and SUM values produce exact safe integer totals');
        overviewPgCheck($overview['categories'] === [
            ['category' => 'metodologia', 'courses' => 1, 'published_courses' => 1, 'draft_courses' => 0, 'current_lessons' => 2],
            ['category' => 'negocios', 'courses' => 1, 'published_courses' => 0, 'draft_courses' => 1, 'current_lessons' => 0],
            ['category' => 'sistemas', 'courses' => 1, 'published_courses' => 0, 'draft_courses' => 1, 'current_lessons' => 1],
        ], 'only the latest version and shared editorial courses contribute to categories');
        $aggregateQueries = 0;
        $editorialReadsOnly = true;
        foreach ($queries as $query) {
            $sql = strtolower($query['query']);
            $editorialReadsOnly = $editorialReadsOnly && str_starts_with($sql, 'select ')
                && !str_contains($sql, 'educational_course_favorites')
                && !str_contains($sql, 'educational_lesson_progress') && !str_contains($sql, 'tutor');
            if (str_contains($sql, 'count(*) as courses')) {
                $aggregateQueries++;
            }
        }
        overviewPgCheck($editorialReadsOnly, 'repository reads only editorial data without mutations or student tables');
        overviewPgCheck($aggregateQueries === 1, 'one SQL aggregate statement supplies every metric');
        $stage = 'denial';
        overviewPgCheck($repository->adminOverview(PortalGrant::allow('qa-overview-client', 'manager', PortalAccessGate::MANAGE, 1, time() + 30)) === null
            && $repository->adminOverview(PortalGrant::allow('imagine-editorial', 'reader', PortalAccessGate::VIEW, 1, time() + 30)) === null,
            'client managers and view-only grants cannot read the editorial overview');
        DB::table('educational_courses')->where('id', $emptyCourse)->update(['category' => 'unexpected-category']);
        overviewPgCheck($repository->adminOverview($grant) === null,
            'unknown category fails conservatively instead of disappearing from totals');
    } finally {
        $stageBeforeRollback = $stage;
        $stage = 'rollback';
        if (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        $stage = $stageBeforeRollback;
    }
    $stage = 'cleanup_verification';
    overviewPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'all owned fixture rows were rolled back before subsequent seeding');
    echo "PASS C-119: actual PostgreSQL editorial aggregates verified; operational release remains HOLD_NO_GO.\n";
} catch (Throwable $error) {
    // Fixed stage only; no query, connection string, credentials or trace.
    fwrite(STDERR, 'FAIL editorial overview PG at '.$stage.".\n");
    exit(1);
}
