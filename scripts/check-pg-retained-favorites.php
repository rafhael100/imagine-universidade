<?php

declare(strict_types=1);

/** Actual retained-preference query on isolated CI PostgreSQL, before seeding. */
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
        fwrite(STDERR, "HOLD retained favorites PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD retained favorites PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD retained favorites PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD retained favorites PG: pdo_pgsql required.\n");
    exit(2);
}

function retainedPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Retained preference check failed.');
    }
    echo 'PASS retained favorites PG: '.$label.PHP_EOL;
}

$stage = 'bootstrap';
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $config = $app->make('config');
    retainedPgCheck($config->get('database.default') === 'pgsql'
        && empty($config->get('database.connections.pgsql.url'))
        && $config->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $config->get('database.connections.pgsql.port') === '5432'
        && $config->get('database.connections.pgsql.database') === 'uni_ci'
        && $config->get('database.connections.pgsql.username') === 'uni_ci'
        && $config->get('database.connections.pgsql.password') === 'synthetic_ci_only',
        'effective Laravel connection is the fixed disposable PostgreSQL laboratory');
    $keys = ['imagine-editorial', 'qa-retained-a', 'qa-retained-b'];
    $stage = 'fixture_guard';
    retainedPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'fixtures precede editorial seeding and never overwrite existing organizations');
    $repository = $app->make(UniversityCatalogRepository::class);
    $grant = PortalGrant::allow('qa-retained-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
    retainedPgCheck($repository->retainedFavorites($grant) === 'temporarily_unavailable',
        'missing tenant or editorial organization is unavailable instead of an empty page');

    DB::beginTransaction();
    try {
        $stage = 'fixtures';
        $organizations = [];
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $newCourse = static function (
            int $org, string $slug, array $statuses = ['published'], bool $shared = true, bool $published = true,
        ): int {
            $id = (int) DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org, 'slug' => $slug,
                'title' => 'RESTRICTED TITLE', 'summary' => 'RESTRICTED SUMMARY', 'category' => 'sistemas',
                'is_shared' => $shared, 'is_published' => $published,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($statuses as $index => $status) {
                DB::table('educational_course_versions')->insert([
                    'educational_course_id' => $id, 'version' => $index + 1, 'status' => $status,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return $id;
        };
        $favorite = static function (int $org, string $subject, int $course, string $saved = '2026-11-17 10:00:00'): void {
            DB::table('educational_course_favorites')->insert([
                'educational_organization_id' => $org, 'subject_key' => $subject,
                'educational_course_id' => $course, 'created_at' => $saved, 'updated_at' => $saved,
            ]);
        };
        $ownIds = [];
        $foreignCursor = null;
        for ($number = 1; $number <= 55; $number++) {
            $id = $newCourse($organizations['imagine-editorial'], 'qa-retained-'.$number,
                $number === 1 ? ['archived', 'archived', 'published'] : ['published']);
            $favorite($organizations['qa-retained-a'], 'same-person', $id);
            $ownIds[] = $id;
            if ($number === 25) {
                $foreignCursor = $newCourse($organizations['imagine-editorial'], 'qa-other-private-reference');
                $favorite($organizations['qa-retained-b'], 'same-person', $foreignCursor);
                $favorite($organizations['qa-retained-a'], 'another-person', $foreignCursor);
            }
        }
        $retired = $newCourse($organizations['imagine-editorial'], 'qa-retained-withdrawn',
            ['archived', 'archived', 'draft'], published: false);
        $favorite($organizations['qa-retained-a'], 'same-person', $retired, '2020-01-01 00:00:00');
        $ownIds[] = $retired;
        foreach ([
            $newCourse($organizations['imagine-editorial'], 'qa-never-published', ['draft']),
            $newCourse($organizations['imagine-editorial'], 'qa-unshared', shared: false),
            $newCourse($organizations['qa-retained-b'], 'qa-foreign-content'),
            $newCourse($organizations['imagine-editorial'], 'qa-without-version', []),
        ] as $excluded) {
            $favorite($organizations['qa-retained-a'], 'same-person', $excluded);
        }

        $reading = false;
        $unexpected = [];
        $metadataReads = [];
        DB::listen(static function (QueryExecuted $query) use (&$reading, &$unexpected, &$metadataReads): void {
            if (!$reading) {
                return;
            }
            if (!preg_match('/^\s*select\b/i', $query->sql)
                || preg_match('/educational_lessons|educational_lesson_progress|educational_reading_positions|educational_tutor|educational_audit/i', $query->sql)
                || (!str_contains($query->sql, 'educational_organizations')
                    && !str_contains($query->sql, 'educational_course_favorites'))) {
                $unexpected[] = true;
            }
            if (str_contains($query->sql, 'educational_course_favorites')) {
                if (preg_match('/title|summary|category|body/i', $query->sql)) {
                    $unexpected[] = true;
                }
                $metadataReads[] = $query->sql;
            }
        });
        $read = static function (PortalGrant $current, ?int $cursor = null) use ($repository, &$reading): array|string {
            $reading = true;
            try {
                return $repository->retainedFavorites($current, $cursor);
            } finally {
                $reading = false;
            }
        };
        $grant = PortalGrant::allow('qa-retained-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
        $stage = 'pagination';
        $first = $read($grant);
        retainedPgCheck(is_array($first) && $first['schema_version'] === 1
            && $first['scope'] === 'current_authenticated_student'
            && count($first['favorites']) === 50
            && array_column($first['favorites'], 'course_id') === array_slice($ownIds, 0, 50)
            && $first['next_after_course_id'] === $ownIds[49]
            && count($metadataReads) === 1 && str_contains(strtolower($metadataReads[0]), 'limit 51'),
            'first page uses one metadata query with fifty rows and an explicit sentinel continuation');
        $last = $read($grant, $first['next_after_course_id']);
        retainedPgCheck(is_array($last) && array_column($last['favorites'], 'course_id') === array_slice($ownIds, 50)
            && $last['next_after_course_id'] === null,
            'remaining references are neither truncated nor multiplied by archived versions');
        retainedPgCheck(array_keys($first['favorites'][0]) === ['course_id', 'course_slug', 'saved_at', 'availability']
            && $first['favorites'][0]['saved_at'] === '2026-11-17T10:00:00Z'
            && $first['favorites'][0]['availability'] === 'available'
            && $last['favorites'][5] === ['course_id' => $retired, 'course_slug' => 'qa-retained-withdrawn',
                'saved_at' => '2020-01-01T00:00:00Z', 'availability' => 'unavailable'],
            'actual PostgreSQL timestamps become UTC dates while withdrawn references contain no content');

        $stage = 'private_scope';
        foreach ([['qa-retained-b', 'same-person'], ['qa-retained-a', 'another-person']] as [$company, $subject]) {
            $other = $read(PortalGrant::allow($company, $subject, PortalAccessGate::VIEW, 1, time() + 60));
            retainedPgCheck(is_array($other) && array_column($other['favorites'], 'course_id') === [$foreignCursor]
                && $other['next_after_course_id'] === null,
                'the same person in another company and a colleague see only their own preference');
        }
        $afterForeign = $read($grant, $foreignCursor);
        retainedPgCheck(is_array($afterForeign) && array_column($afterForeign['favorites'], 'course_id')
            === array_values(array_filter($ownIds, static fn (int $id): bool => $id > $foreignCursor)),
            'a cursor belonging to another private scope is only a lower bound and reveals no foreign row');
        foreach ([2147483648, 9007199254740991] as $cursor) {
            $empty = $read($grant, $cursor);
            retainedPgCheck(is_array($empty) && $empty['favorites'] === [] && $empty['next_after_course_id'] === null,
                'an absent large safe cursor yields a valid empty page without an anchor lookup or int4 error');
        }

        $stage = 'strict_metadata';
        DB::table('educational_course_favorites')->where('educational_organization_id', $organizations['qa-retained-a'])
            ->where('subject_key', 'same-person')->where('educational_course_id', $ownIds[50])->update(['created_at' => null]);
        $refused = false;
        try {
            $read($grant);
        } catch (UnexpectedValueException) {
            $refused = true;
        }
        retainedPgCheck($refused, 'invalid sentinel metadata refuses the entire page rather than concealing a broken continuation');
        DB::table('educational_course_favorites')->where('educational_organization_id', $organizations['qa-retained-a'])
            ->where('subject_key', 'same-person')->where('educational_course_id', $ownIds[50])->update(['created_at' => '2026-11-17 10:00:00']);
        DB::table('educational_courses')->where('id', $ownIds[0])->update(['slug' => 'Invalid-Slug']);
        $refused = false;
        try {
            $read($grant);
        } catch (UnexpectedValueException) {
            $refused = true;
        }
        retainedPgCheck($refused, 'invalid stored slugs are rejected without returning partial metadata');
        DB::table('educational_courses')->where('id', $ownIds[0])->update(['slug' => 'qa-retained-1']);

        $stage = 'withdrawal_and_cursor_removal';
        DB::table('educational_course_favorites')->where('educational_organization_id', $organizations['qa-retained-a'])
            ->where('subject_key', 'same-person')->where('educational_course_id', $first['next_after_course_id'])->delete();
        $continued = $read($grant, $first['next_after_course_id']);
        retainedPgCheck(is_array($continued) && $continued === $last,
            'removing the last preference of the previous page does not invalidate its numeric continuation');
        DB::table('educational_course_versions')->where('educational_course_id', $retired)->where('status', 'draft')
            ->update(['status' => 'published']);
        DB::table('educational_courses')->where('id', $retired)->update(['is_published' => true]);
        $republished = $read($grant, $ownIds[54]);
        retainedPgCheck(is_array($republished) && $republished['favorites'] === [
            ['course_id' => $retired, 'course_slug' => 'qa-retained-withdrawn',
                'saved_at' => '2020-01-01T00:00:00Z', 'availability' => 'available'],
        ], 'republication changes availability without resetting the original preference or its old date');
        DB::table('educational_courses')->where('id', $retired)->update(['is_published' => false]);
        $flagFalse = $read($grant, $ownIds[54]);
        retainedPgCheck(is_array($flagFalse) && $flagFalse['favorites'][0]['availability'] === 'unavailable',
            'a published version alone does not override an unavailable course flag');
        DB::table('educational_courses')->where('id', $retired)->update(['is_published' => true]);
        DB::table('educational_course_versions')->where('educational_course_id', $retired)->where('status', 'published')
            ->update(['status' => 'archived']);
        $noLiveVersion = $read($grant, $ownIds[54]);
        retainedPgCheck(is_array($noLiveVersion) && $noLiveVersion['favorites'][0]['availability'] === 'unavailable',
            'a published course flag alone does not replace the required current published version');

        $stage = 'authorization';
        foreach ([PortalGrant::deny(),
            PortalGrant::allow('qa-retained-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, time() + 30),
        ] as $invalid) {
            retainedPgCheck($read($invalid) === 'access_denied', 'nonstudent or denied grants never expose retained references');
        }
        retainedPgCheck($unexpected === [], 'read paths perform only scoped metadata SELECTs without content or other learning tables');
    } finally {
        DB::rollBack();
    }
    $stage = 'rollback';
    retainedPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'all fixture organizations and retained preferences were rolled back');
    echo "PASS retained favorites PG: actual repository, private pagination, UTC metadata and withdrawal boundaries.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'FAIL retained favorites PG at '.$stage.' ('.get_class($error).").\n");
    exit(1);
}
