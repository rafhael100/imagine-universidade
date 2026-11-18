<?php

declare(strict_types=1);

/** Actual private completion-history query on disposable CI PostgreSQL, before seeding. */
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
        fwrite(STDERR, "HOLD progress history PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD progress history PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD progress history PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD progress history PG: pdo_pgsql required.\n");
    exit(2);
}

function historyPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Private completion history check failed.');
    }
    echo 'PASS progress history PG: '.$label.PHP_EOL;
}

$stage = 'bootstrap';
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $config = $app->make('config');
    historyPgCheck($config->get('database.default') === 'pgsql'
        && empty($config->get('database.connections.pgsql.url'))
        && $config->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $config->get('database.connections.pgsql.port') === '5432'
        && $config->get('database.connections.pgsql.database') === 'uni_ci'
        && $config->get('database.connections.pgsql.username') === 'uni_ci'
        && $config->get('database.connections.pgsql.password') === 'synthetic_ci_only',
        'effective connection is the fixed disposable PostgreSQL laboratory');
    $keys = ['imagine-editorial', 'qa-history-a', 'qa-history-b'];
    $stage = 'fixture_guard';
    historyPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'fixtures precede the editorial seed and never overwrite existing organizations');
    $repository = $app->make(UniversityCatalogRepository::class);
    $grant = PortalGrant::allow('qa-history-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
    historyPgCheck($repository->progressHistory($grant) === 'temporarily_unavailable',
        'missing tenant or editorial organization does not become an empty history');

    DB::beginTransaction();
    try {
        $stage = 'fixtures';
        $organizations = [];
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $course = static function (int $org, string $slug, bool $shared = true, bool $published = true): int {
            return (int) DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org, 'slug' => $slug, 'title' => 'RESTRICTED TITLE',
                'summary' => 'RESTRICTED SUMMARY', 'category' => 'metodologia',
                'is_shared' => $shared, 'is_published' => $published, 'created_at' => now(), 'updated_at' => now(),
            ]);
        };
        $version = static function (int $courseId, int $number, string $status, int $count = 1): array {
            $id = (int) DB::table('educational_course_versions')->insertGetId([
                'educational_course_id' => $courseId, 'version' => $number, 'status' => $status,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $lessons = [];
            for ($index = 1; $index <= $count; $index++) {
                $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                    'educational_course_version_id' => $id, 'slug' => 'lesson-'.$index,
                    'title' => 'RESTRICTED LESSON TITLE', 'body' => 'RESTRICTED LESSON BODY',
                    'sort_order' => $index, 'is_published' => $status === 'published',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return ['id' => $id, 'lessons' => $lessons];
        };
        $complete = static function (int $org, string $subject, int $lesson, string $at = '2026-11-17 13:00:00+03'): int {
            return (int) DB::table('educational_lesson_progress')->insertGetId([
                'educational_organization_id' => $org, 'subject_key' => $subject,
                'educational_lesson_id' => $lesson, 'completed_at' => $at,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        };
        $volume = $course($organizations['imagine-editorial'], 'qa-history-volume');
        $volumeVersion = $version($volume, 1000001, 'published', 55);
        $ownIds = [];
        $ownLessons = [];
        $foreignCursor = null;
        foreach (array_reverse($volumeVersion['lessons']) as $index => $lesson) {
            $id = $complete($organizations['qa-history-a'], 'same-person', $lesson);
            $ownIds[] = $id; $ownLessons[$id] = $lesson;
            if ($index === 24) {
                $foreignCursor = $complete($organizations['qa-history-b'], 'same-person', $lesson);
                $colleague = $complete($organizations['qa-history-a'], 'another-person', $lesson);
            }
        }
        $reissued = $course($organizations['imagine-editorial'], 'qa-history-reissued');
        $oldVersion = $version($reissued, 1, 'archived');
        $liveVersion = $version($reissued, 2, 'published');
        $oldId = $complete($organizations['qa-history-a'], 'same-person', $oldVersion['lessons'][0], '2020-01-01 00:00:00+00');
        $liveId = $complete($organizations['qa-history-a'], 'same-person', $liveVersion['lessons'][0]);
        $ownIds[] = $oldId; $ownIds[] = $liveId;
        $ownLessons[$oldId] = $oldVersion['lessons'][0]; $ownLessons[$liveId] = $liveVersion['lessons'][0];
        $ownIds = array_reverse($ownIds);
        foreach ([
            [$course($organizations['imagine-editorial'], 'qa-history-draft', published: false), 'draft'],
            [$course($organizations['imagine-editorial'], 'qa-history-private', shared: false), 'published'],
            [$course($organizations['qa-history-b'], 'qa-history-foreign'), 'published'],
        ] as [$excludedCourse, $status]) {
            $excludedVersion = $version($excludedCourse, 1, $status);
            $complete($organizations['qa-history-a'], 'same-person', $excludedVersion['lessons'][0]);
        }
        $grant = PortalGrant::allow('qa-history-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
        $exportBefore = $repository->exportProgress($grant);
        $reading = false;
        $unexpected = [];
        $metadataReads = [];
        DB::listen(static function (QueryExecuted $query) use (&$reading, &$unexpected, &$metadataReads): void {
            if (!$reading) { return; }
            if (!preg_match('/^\s*select\b/i', $query->sql)
                || preg_match('/educational_course_favorites|educational_reading_positions|educational_tutor|educational_audit/i', $query->sql)
                || (!str_contains($query->sql, 'educational_organizations')
                    && !str_contains($query->sql, 'educational_lesson_progress'))) {
                $unexpected[] = true;
            }
            if (str_contains($query->sql, 'educational_lesson_progress')) {
                if (preg_match('/title|body|summary|category/i', $query->sql)) { $unexpected[] = true; }
                $metadataReads[] = $query->sql;
            }
        });
        $read = static function (PortalGrant $current, ?int $cursor = null) use ($repository, &$reading): array|string {
            $reading = true;
            try { return $repository->progressHistory($current, $cursor); }
            finally { $reading = false; }
        };
        $stage = 'pagination_and_exact_versions';
        $first = $read($grant);
        historyPgCheck(is_array($first) && $first['schema_version'] === 1 && $first['scope'] === 'current_authenticated_student'
            && array_column($first['completions'], 'completion_id') === array_slice($ownIds, 0, 50)
            && $first['next_before_id'] === $ownIds[49]
            && count($metadataReads) === 1 && str_contains(strtolower($metadataReads[0]), 'limit 51'),
            'one metadata query returns fifty references in descending record order with explicit continuation');
        $second = $read($grant, $first['next_before_id']);
        historyPgCheck(is_array($second) && array_column($second['completions'], 'completion_id') === array_slice($ownIds, 50)
            && $second['next_before_id'] === null,
            'equal completion timestamps and different lesson order neither duplicate nor skip references');
        historyPgCheck($first['completions'][0] === ['completion_id' => $liveId, 'course_slug' => 'qa-history-reissued',
            'course_version' => 2, 'lesson_slug' => 'lesson-1', 'completed_at' => '2026-11-17T10:00:00Z', 'availability' => 'available']
            && $first['completions'][1] === ['completion_id' => $oldId, 'course_slug' => 'qa-history-reissued',
                'course_version' => 1, 'lesson_slug' => 'lesson-1', 'completed_at' => '2020-01-01T00:00:00Z', 'availability' => 'unavailable']
            && $first['completions'][2]['course_version'] === 1000001,
            'actual timestamptz becomes UTC while an archived completion remains unavailable after republication');
        historyPgCheck($repository->exportProgress($grant) === $exportBefore,
            'paginated reads preserve the existing export contract and original completion records');

        $stage = 'scope_and_cursor_bounds';
        foreach ([['qa-history-b', 'same-person', $foreignCursor], ['qa-history-a', 'another-person', $colleague]] as [$company, $subject, $id]) {
            $other = $read(PortalGrant::allow($company, $subject, PortalAccessGate::VIEW, 1, time() + 60));
            historyPgCheck(is_array($other) && array_column($other['completions'], 'completion_id') === [$id],
                'the same person in another company and a colleague see only their own completion');
        }
        $bounded = $read($grant, $foreignCursor);
        historyPgCheck(is_array($bounded) && array_column($bounded['completions'], 'completion_id')
            === array_values(array_filter($ownIds, static fn (int $id): bool => $id < $foreignCursor)),
            'a foreign cursor is only a bound and never widens the authenticated private scope');
        foreach ([2147483648, 9007199254740991] as $cursor) {
            $large = $read($grant, $cursor);
            historyPgCheck(is_array($large) && $large === $first,
                'an absent safe cursor above int4 stays scoped and never requires an anchor record');
        }
        $empty = $read($grant, end($ownIds));
        historyPgCheck(is_array($empty) && $empty['completions'] === [] && $empty['next_before_id'] === null,
            'an exhausted bound returns a valid empty page without fabricating an error');

        $stage = 'strict_sentinel';
        $sentinelLesson = $ownLessons[$ownIds[50]];
        $originalSlug = DB::table('educational_lessons')->where('id', $sentinelLesson)->value('slug');
        DB::table('educational_lessons')->where('id', $sentinelLesson)->update(['slug' => 'Invalid-Slug']);
        $refused = false;
        try { $read($grant); } catch (UnexpectedValueException) { $refused = true; }
        historyPgCheck($refused, 'an invalid fifty-first reference refuses the whole page instead of hiding a broken continuation');
        DB::table('educational_lessons')->where('id', $sentinelLesson)->update(['slug' => $originalSlug]);

        $stage = 'removed_cursor_and_new_records';
        DB::table('educational_lesson_progress')->where('id', $first['next_before_id'])->delete();
        historyPgCheck($read($grant, $first['next_before_id']) === $second,
            'removing a cursor record does not invalidate continuation of the retained references');
        $additionalCourse = $course($organizations['imagine-editorial'], 'qa-history-additional');
        $additionalVersion = $version($additionalCourse, 1, 'published');
        $newId = $complete($organizations['qa-history-a'], 'same-person', $additionalVersion['lessons'][0]);
        $restart = $read($grant);
        historyPgCheck(is_array($restart) && $restart['completions'][0]['completion_id'] === $newId
            && $read($grant, $first['next_before_id']) === $second,
            'new records appear on a fresh first page while the existing descending bound remains stable');

        $stage = 'availability_and_safe_identifiers';
        DB::table('educational_lessons')->where('id', $additionalVersion['lessons'][0])->update(['is_published' => false]);
        $hiddenLesson = $read($grant);
        historyPgCheck(is_array($hiddenLesson) && $hiddenLesson['completions'][0]['availability'] === 'unavailable',
            'a currently published version does not expose a withdrawn exact lesson');
        DB::table('educational_lessons')->where('id', $additionalVersion['lessons'][0])->update(['is_published' => true]);
        DB::table('educational_courses')->where('id', $additionalCourse)->update(['is_published' => false]);
        $hiddenCourse = $read($grant);
        historyPgCheck(is_array($hiddenCourse) && $hiddenCourse['completions'][0]['availability'] === 'unavailable',
            'a published lesson and version do not override an unavailable course');
        DB::table('educational_lesson_progress')->where('id', $newId)->update(['id' => 9007199254740992]);
        $refused = false;
        try { $read($grant); } catch (UnexpectedValueException) { $refused = true; }
        historyPgCheck($refused, 'PostgreSQL bigint completion IDs outside JavaScript safe range are rejected without rounding');

        $stage = 'authorization';
        foreach ([PortalGrant::deny(),
            PortalGrant::allow('qa-history-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, time() + 30),
        ] as $invalid) {
            historyPgCheck($read($invalid) === 'access_denied', 'nonstudent or denied grants never authorize a private completion history');
        }
        historyPgCheck($unexpected === [], 'history reads select no content, other learning records or mutations');
    } finally {
        DB::rollBack();
    }
    $stage = 'rollback';
    historyPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'all synthetic organizations, versions, lessons and completion records were rolled back');
    echo "PASS progress history PG: actual repository, private record pagination, exact version availability and UTC timestamps.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'FAIL progress history PG at '.$stage.' ('.get_class($error).").\n");
    exit(1);
}
