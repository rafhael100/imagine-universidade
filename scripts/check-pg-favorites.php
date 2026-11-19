<?php

declare(strict_types=1);

/**
 * Actual UniversityCatalogRepository against disposable PostgreSQL18.
 * The second connection verifies course/version locks held during the fresh
 * grant callback. No HTTP identity, production provider or retention event.
 */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

foreach ([
    'APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci', 'DB_USERNAME' => 'uni_ci',
    'DB_PASSWORD' => 'synthetic_ci_only',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "HOLD favorites PG QA: fixed disposable database required.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD favorites PG QA: pdo_pgsql required.\n");
    exit(2);
}

function favoriteCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Favorites contract failed: '.$label);
    }
    echo 'PASS favorites PG: '.$label.PHP_EOL;
}

function favoriteLockHeld(PDO $peer, string $table, int $id): bool
{
    if (!in_array($table, ['educational_courses', 'educational_course_versions'], true)) {
        throw new RuntimeException('Unsupported lock probe.');
    }
    $peer->beginTransaction();
    try {
        $peer->exec("SET LOCAL lock_timeout = '250ms'");
        $probe = $peer->prepare('SELECT id FROM '.$table.' WHERE id = :id FOR UPDATE');
        try {
            $probe->execute(['id' => $id]);
            return false;
        } catch (PDOException $error) {
            return ($error->errorInfo[0] ?? $error->getCode()) === '55P03';
        }
    } finally {
        if ($peer->inTransaction()) {
            $peer->rollBack();
        }
    }
}

try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    favoriteCheck(DB::getDriverName() === 'pgsql', 'Laravel uses PostgreSQL');
    $repository = $app->make(UniversityCatalogRepository::class);
    $peer = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci', 'synthetic_ci_only', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $organizations = [];
    $courses = [];
    try {
        $keys = ['imagine-editorial', 'qa-favorites-company-a', 'qa-favorites-company-b'];
        favoriteCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
            'fixture identities do not overwrite existing organizations');
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $organizations['imagine-editorial'],
            'slug' => 'qa-private-favorites', 'title' => 'Curso sintético de favoritos',
            'category' => 'metodologia', 'is_shared' => true, 'is_published' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $courses[] = $course;
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => 'published',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $grantA = PortalGrant::allow('qa-favorites-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
        $grantB = PortalGrant::allow('qa-favorites-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
        $colleague = PortalGrant::allow('qa-favorites-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30);
        $inside = false;
        $courseLocked = false;
        $versionLocked = false;
        $saved = $repository->favoriteCourse($grantA, $course, static function () use (
            $peer, $course, $version, $grantA, &$inside, &$courseLocked, &$versionLocked
        ): PortalGrant {
            $inside = DB::transactionLevel() > 0;
            $courseLocked = favoriteLockHeld($peer, 'educational_courses', $course);
            $versionLocked = favoriteLockHeld($peer, 'educational_course_versions', $version);
            return $grantA;
        });
        favoriteCheck($saved && $inside && $courseLocked && $versionLocked,
            'fresh grant runs inside transaction with course and version rows locked');
        favoriteCheck($repository->favoriteCourse($grantA, $course, static fn () => $grantA)
            && DB::table('educational_course_favorites')->count() === 1,
            'duplicate PUT is idempotent in the actual repository');
        $duplicateRejected = false;
        try {
            $duplicate = $peer->prepare('INSERT INTO educational_course_favorites
                (educational_organization_id, subject_key, educational_course_id, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
            $duplicate->execute([$organizations['qa-favorites-company-a'], 'same-person', $course]);
        } catch (PDOException $error) {
            $duplicateRejected = ($error->errorInfo[0] ?? $error->getCode()) === '23505';
        }
        favoriteCheck($duplicateRejected, 'database rejects duplicate tenant/subject/course independently');
        favoriteCheck($repository->favoriteCourseIds($grantB) === []
            && $repository->favoriteCourseIds($colleague) === [],
            'same person in another company and colleague in same company start isolated');
        favoriteCheck($repository->favoriteCourse($grantB, $course, static fn () => $grantB)
            && $repository->favoriteCourse($colleague, $course, static fn () => $colleague)
            && DB::table('educational_course_favorites')->count() === 3,
            'all three private keys coexist');
        favoriteCheck(!$repository->unfavoriteCourse($grantA, $course, static fn () => PortalGrant::deny('revoked'))
            && DB::table('educational_course_favorites')->count() === 3,
            'revoked fresh decision preserves the existing preference');

        DB::transaction(static function () use ($course, $version): void {
            DB::table('educational_courses')->where('id', $course)->lockForUpdate()->first();
            DB::table('educational_course_versions')->where('id', $version)->lockForUpdate()->first();
            DB::table('educational_courses')->where('id', $course)->update(['is_published' => false]);
            DB::table('educational_course_versions')->where('id', $version)->update(['status' => 'archived']);
        });
        favoriteCheck($repository->favoriteCourseIds($grantA) === []
            && !$repository->favoriteCourse($grantA, $course, static fn () => $grantA)
            && DB::table('educational_course_favorites')->count() === 3,
            'withdrawal hides favorites and denies PUT without erasing preferences');
        $exported = $repository->exportFavorites($grantA);
        favoriteCheck($exported !== null && $exported['schema_version'] === 1
            && $exported['scope'] === 'current_authenticated_student'
            && count($exported['favorites']) === 1
            && array_keys($exported['favorites'][0]) === ['course_slug', 'saved_at']
            && $exported['favorites'][0]['course_slug'] === 'qa-private-favorites'
            && $exported['favorites'][0]['saved_at'] !== '',
            'private export retains only the owner reference and saved timestamp after withdrawal');
        $removalLocked = false;
        favoriteCheck($repository->unfavoriteCourse($grantA, $course, static function () use (
            $peer, $course, $grantA, &$removalLocked
        ): PortalGrant {
            $removalLocked = DB::transactionLevel() > 0
                && favoriteLockHeld($peer, 'educational_courses', $course);
            return $grantA;
        }) && $removalLocked, 'owner can remove withdrawn favorite under course lock');
        favoriteCheck($repository->unfavoriteCourse($grantA, $course, static fn () => $grantA)
            && DB::table('educational_course_favorites')->count() === 2,
            'repeated DELETE preserves other students and tenants');
        favoriteCheck($repository->exportFavorites($grantA)['favorites'] === []
            && count($repository->exportFavorites($grantB)['favorites']) === 1,
            'export after removal stays empty for one company and preserves the other company history');
        favoriteCheck(DB::table('educational_course_favorites')
            ->where('educational_organization_id', $organizations['qa-favorites-company-b'])
            ->where('subject_key', 'same-person')->where('educational_course_id', $course)->exists()
            && DB::table('educational_course_favorites')
            ->where('educational_organization_id', $organizations['qa-favorites-company-a'])
            ->where('subject_key', 'another-person')->where('educational_course_id', $course)->exists(),
            'remaining records retain their exact company and person');
    } finally {
        if ($peer->inTransaction()) {
            $peer->rollBack();
        }
        if ($courses !== []) {
            DB::table('educational_course_favorites')->whereIn('educational_course_id', $courses)->delete();
            DB::table('educational_course_versions')->whereIn('educational_course_id', $courses)->delete();
            DB::table('educational_courses')->whereIn('id', $courses)->delete();
        }
        if ($organizations !== []) {
            DB::table('educational_organizations')->whereIn('id', array_values($organizations))->delete();
        }
    }
    echo "PASS: actual favorites repository, two PostgreSQL connections, private keys and lock fences; fixture rows removed.\n";
} catch (Throwable $error) {
    // No SQL, connection string, credentials or exception trace in diagnostics.
    fwrite(STDERR, "FAIL: disposable PostgreSQL favorites checks did not complete.\n");
    exit(1);
}
