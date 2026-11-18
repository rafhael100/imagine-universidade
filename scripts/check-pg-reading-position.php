<?php

declare(strict_types=1);

/**
 * C-121: actual repository and two PostgreSQL connections in disposable CI.
 * Owned fixtures are committed only so the peer can exercise real locks, then
 * removed by their captured IDs. No operational provider, purge or role edits.
 */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\ReadingPositionRevision;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

foreach ([
    'CI' => 'true', 'GITHUB_ACTIONS' => 'true',
    'GITHUB_REPOSITORY' => 'rafhael100/imagine-universidade',
    'APP_ENV' => 'testing', 'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'DB_CONNECTION' => 'pgsql', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci', 'DB_USERNAME' => 'uni_ci', 'DB_PASSWORD' => 'synthetic_ci_only',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "HOLD reading position PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD reading position PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD reading position PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD reading position PG: pdo_pgsql required.\n");
    exit(2);
}

function readingPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Reading position check failed.');
    }
    echo 'PASS reading position PG: '.$label.PHP_EOL;
}

/** Fixed, parameterized statements only. A failed peer transaction is rolled back. */
function readingPgBlocked(PDO $peer, string $probe, array $parameters): bool
{
    $sql = match ($probe) {
        'course' => 'SELECT id FROM educational_courses WHERE id=:id FOR UPDATE',
        'version' => 'SELECT id FROM educational_course_versions WHERE id=:id FOR UPDATE',
        'slot' => 'UPDATE educational_reading_positions SET revision=:next
            WHERE educational_organization_id=:org AND subject_key=:subject AND revision=:expected',
        default => throw new RuntimeException('Unsupported lock probe.'),
    };
    $peer->beginTransaction();
    try {
        $peer->exec("SET LOCAL lock_timeout = '250ms'");
        $peer->exec("SET LOCAL statement_timeout = '1000ms'");
        try {
            $statement = $peer->prepare($sql);
            $statement->execute($parameters);
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

$stage = 'bootstrap';
$peer = null;
$organizations = [];
$courses = [];
$versions = [];
$lessons = [];
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $configuration = $app->make('config');
    readingPgCheck($configuration->get('database.default') === 'pgsql'
        && empty($configuration->get('database.connections.pgsql.url'))
        && $configuration->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $configuration->get('database.connections.pgsql.port') === '5432'
        && $configuration->get('database.connections.pgsql.database') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.username') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.password') === 'synthetic_ci_only'
        && $configuration->get('app.key') === 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        'effective Laravel settings match only the disposable laboratory');
    $keys = ['imagine-editorial', 'qa-reading-company-a', 'qa-reading-company-b'];
    $stage = 'fixture_guard';
    readingPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'fixtures run before editorial seeding without overwriting organizations');
    $peer = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci', 'synthetic_ci_only', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false]);
    $peer->exec("SET statement_timeout = '3000ms'");
    readingPgCheck((int) DB::selectOne('SELECT pg_backend_pid() AS pid')->pid
        !== (int) $peer->query('SELECT pg_backend_pid()')->fetchColumn(),
        'repository and peer use independent PostgreSQL sessions');

    try {
        $stage = 'fixtures';
        foreach ($keys as $key) {
            $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $organizations['imagine-editorial'],
            'slug' => 'qa-exact-reading', 'title' => 'Curso sintético de leitura',
            'category' => 'metodologia', 'is_shared' => true, 'is_published' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $courses[] = $course;
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => 'published',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $versions[] = $version;
        foreach (['first', 'second'] as $slug) {
            $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version, 'slug' => $slug,
                'title' => 'Aula sintética', 'body' => 'Material de laboratório descartável.',
                'is_published' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $repository = $app->make(UniversityCatalogRepository::class);
        $tokens = $app->make(ReadingPositionRevision::class);
        $grantA = PortalGrant::allow('qa-reading-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
        $grantB = PortalGrant::allow('qa-reading-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 60);
        $colleague = PortalGrant::allow('qa-reading-company-a', 'colleague', PortalAccessGate::VIEW, 1, time() + 60);
        $org = $organizations['qa-reading-company-a'];
        $stage = 'initial_state';
        $initial = $repository->readingPosition($grantA, $tokens);
        readingPgCheck($initial !== null && $initial['status'] === 'none'
            && str_starts_with($initial['revision'], 'a1.')
            && DB::table('educational_reading_positions')->count() === 0,
            'initial GET issues only a bounded opaque ticket and performs no insert');
        $courseLocked = false;
        $versionLocked = false;
        $inside = false;
        $saved = $repository->saveReadingPosition($grantA, $course, 1, $lessons[0], $initial['revision'], $tokens,
            static function () use ($peer, $course, $version, $grantA, &$courseLocked, &$versionLocked, &$inside): PortalGrant {
                $inside = DB::transactionLevel() > 0;
                $courseLocked = readingPgBlocked($peer, 'course', ['id' => $course]);
                $versionLocked = readingPgBlocked($peer, 'version', ['id' => $version]);
                return $grantA;
            });
        readingPgCheck(is_array($saved) && $inside && $courseLocked && $versionLocked,
            'initial save holds course and version locks before the live authority decision');
        readingPgCheck($repository->readingPosition($grantA, $tokens) === $saved
            && preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/', $saved['position']['saved_at']) === 1,
            'PostgreSQL timestamp offsets normalize to the same UTC receipt and GET snapshot');
        readingPgCheck($repository->readingPosition($grantB, $tokens)['status'] === 'none'
            && $repository->readingPosition($colleague, $tokens)['status'] === 'none',
            'same person in another company and a colleague remain isolated');

        $stage = 'existing_slot_race';
        $oldRevision = $saved['revision'];
        $peerRevision = $tokens->next();
        $slotLocked = false;
        $changed = $repository->saveReadingPosition($grantA, $course, 1, $lessons[1], $oldRevision, $tokens,
            static function () use ($peer, $org, $oldRevision, $peerRevision, $grantA, &$slotLocked): PortalGrant {
                $slotLocked = readingPgBlocked($peer, 'slot', ['org' => $org, 'subject' => 'same-person',
                    'expected' => $oldRevision, 'next' => $peerRevision]);
                return $grantA;
            });
        readingPgCheck(is_array($changed) && $slotLocked && $changed['revision'] !== $oldRevision,
            'a second writer times out while the repository holds the private slot lock');
        $peerCas = $peer->prepare('UPDATE educational_reading_positions SET revision=:next
            WHERE educational_organization_id=:org AND subject_key=:subject AND revision=:expected');
        $peerCas->execute(['next' => $peerRevision, 'org' => $org,
            'subject' => 'same-person', 'expected' => $oldRevision]);
        readingPgCheck($peerCas->rowCount() === 0
            && $repository->saveReadingPosition($grantA, $course, 1, $lessons[0], $oldRevision, $tokens,
                static fn () => $grantA) === 'reading_position_changed',
            'after lock release the old CAS still cannot replace the committed revision');

        $stage = 'first_insert_race';
        $raceGrant = PortalGrant::allow('qa-reading-company-a', 'first-write-race', PortalAccessGate::VIEW, 1, time() + 30);
        $raceTicket = $repository->readingPosition($raceGrant, $tokens)['revision'];
        $winnerRevision = $tokens->next();
        $raced = $repository->saveReadingPosition($raceGrant, $course, 1, $lessons[0], $raceTicket, $tokens,
            static function () use ($peer, $org, $lessons, $winnerRevision, $raceGrant): PortalGrant {
                // Real interleaving: main already observed no slot, peer commits
                // its first write, then the main repository attempts INSERT.
                $statement = $peer->prepare('INSERT INTO educational_reading_positions
                    (educational_organization_id,subject_key,educational_lesson_id,revision,saved_at)
                    VALUES (:org,:subject,:lesson,:revision,CURRENT_TIMESTAMP)');
                $statement->execute(['org' => $org, 'subject' => 'first-write-race',
                    'lesson' => $lessons[1], 'revision' => $winnerRevision]);
                return $raceGrant;
            });
        $winner = $repository->readingPosition($raceGrant, $tokens);
        readingPgCheck($raced === 'reading_position_changed' && $winner['revision'] === $winnerRevision
            && $winner['position']['lesson_id'] === $lessons[1],
            'the unique owner key fences a real competing first INSERT without overwriting its winner');

        $stage = 'post_insert_recheck';
        $lateGrant = PortalGrant::allow('qa-reading-company-a', 'revoked-after-insert', PortalAccessGate::VIEW, 1, time() + 30);
        $lateTicket = $repository->readingPosition($lateGrant, $tokens)['revision'];
        $decisions = 0;
        $late = $repository->saveReadingPosition($lateGrant, $course, 1, $lessons[0], $lateTicket, $tokens,
            static function () use ($lateGrant, &$decisions): PortalGrant {
                $decisions++;
                return $decisions === 1 ? $lateGrant : PortalGrant::deny('revoked');
            });
        readingPgCheck($late === 'access_denied' && $decisions === 2
            && !DB::table('educational_reading_positions')->where('educational_organization_id', $org)
                ->where('subject_key', 'revoked-after-insert')->exists(),
            'a changed live decision after INSERT rolls the new slot back before commit');

        $stage = 'revocation_and_empty_slot';
        $before = (array) DB::table('educational_reading_positions')
            ->where('educational_organization_id', $org)->where('subject_key', 'same-person')->first();
        readingPgCheck($repository->clearReadingPosition($grantA, $changed['revision'], $tokens,
            static fn () => PortalGrant::deny('revoked')) === 'access_denied'
            && $before === (array) DB::table('educational_reading_positions')
                ->where('educational_organization_id', $org)->where('subject_key', 'same-person')->first(),
            'revocation inside removal preserves every private field');
        $empty = $repository->clearReadingPosition($grantA, $changed['revision'], $tokens, static fn () => $grantA);
        $cleared = DB::table('educational_reading_positions')
            ->where('educational_organization_id', $org)->where('subject_key', 'same-person')->first();
        readingPgCheck(is_array($empty) && $empty['status'] === 'none'
            && $cleared->educational_lesson_id === null && $cleared->saved_at === null
            && $empty['revision'] !== $changed['revision'],
            'DELETE clears only reference and date while preserving a newly revised empty slot');
        readingPgCheck($repository->saveReadingPosition($grantA, $course, 1, $lessons[0], $initial['revision'], $tokens,
            static fn () => $grantA) === 'reading_position_changed'
            && $repository->saveReadingPosition($grantA, $course, 1, $lessons[0], $changed['revision'], $tokens,
                static fn () => $grantA) === 'reading_position_changed',
            'neither an initial absence ticket nor a pre-removal revision crosses the empty slot');
        $resaved = $repository->saveReadingPosition($grantA, $course, 1, $lessons[0], $empty['revision'], $tokens,
            static fn () => $grantA);
        readingPgCheck(is_array($resaved), 'a new explicit action with the current empty revision can save');

        $stage = 'withdrawal';
        DB::transaction(static function () use ($course, $version): void {
            DB::table('educational_courses')->where('id', $course)->lockForUpdate()->first();
            DB::table('educational_course_versions')->where('id', $version)->lockForUpdate()->first();
            DB::table('educational_courses')->where('id', $course)->update(['is_published' => false]);
            DB::table('educational_course_versions')->where('id', $version)->update(['status' => 'archived']);
            DB::table('educational_lessons')->where('educational_course_version_id', $version)->update(['is_published' => false]);
        });
        $hidden = $repository->readingPosition($grantA, $tokens);
        $exported = $repository->exportReadingPosition($grantA, $tokens);
        readingPgCheck($hidden['status'] === 'unavailable' && $hidden['position'] === null
            && $hidden['revision'] === $resaved['revision']
            && array_keys($exported['reading_position']) === ['course_slug', 'course_version', 'lesson_slug', 'saved_at']
            && $exported['reading_position']['course_version'] === 1
            && $exported['reading_position']['saved_at'] === $resaved['position']['saved_at'],
            'withdrawal hides the navigable reference but preserves the private historical export');
        readingPgCheck(is_array($repository->clearReadingPosition($grantA, $hidden['revision'], $tokens, static fn () => $grantA)),
            'a withdrawn reference remains removable without a published course');

        $stage = 'schema';
        $unique = DB::selectOne("SELECT COUNT(*) AS n FROM pg_constraint
            WHERE conrelid='educational_reading_positions'::regclass AND contype='u'
            AND pg_get_constraintdef(oid) = 'UNIQUE (educational_organization_id, subject_key)'");
        $foreign = DB::selectOne("SELECT COUNT(*) AS n FROM pg_constraint
            WHERE conrelid='educational_reading_positions'::regclass AND contype='f' AND confdeltype='r'");
        readingPgCheck((int) $unique->n === 1 && (int) $foreign->n === 2,
            'actual PostgreSQL schema enforces one private slot and two RESTRICT references');
    } finally {
        $operationStage = $stage;
        $stage = 'cleanup';
        if ($peer instanceof PDO && $peer->inTransaction()) {
            $peer->rollBack();
        }
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        if ($organizations !== []) {
            DB::table('educational_reading_positions')->whereIn('educational_organization_id', array_values($organizations))->delete();
        }
        if ($lessons !== []) {
            DB::table('educational_lessons')->whereIn('id', $lessons)->delete();
        }
        if ($versions !== []) {
            DB::table('educational_course_versions')->whereIn('id', $versions)->delete();
        }
        if ($courses !== []) {
            DB::table('educational_courses')->whereIn('id', $courses)->delete();
        }
        if ($organizations !== []) {
            DB::table('educational_organizations')->whereIn('id', array_values($organizations))->delete();
        }
        $stage = $operationStage;
    }
    echo "PASS reading position PG: actual repository, two sessions, first-insert race and CAS; owned fixtures removed.\n";
} catch (Throwable $error) {
    // Only a fixed stage and exception class; never SQL, tokens or credentials.
    fwrite(STDERR, 'FAIL reading position PG at '.$stage.' ('.get_class($error).").\n");
    exit(1);
}
