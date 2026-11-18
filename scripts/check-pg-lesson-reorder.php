<?php

declare(strict_types=1);

/**
 * C129: actual repository, parameterized batches and two PostgreSQL sessions.
 * Committed fixtures exist only for real contention and are removed by their
 * captured parent IDs. Run after migrations and before editorial seeding.
 */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

foreach ([
    'CI' => 'true', 'GITHUB_ACTIONS' => 'true',
    'GITHUB_REPOSITORY' => 'rafhael100/imagine-universidade',
    'APP_ENV' => 'testing', 'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'DB_CONNECTION' => 'pgsql', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci', 'DB_USERNAME' => 'uni_ci', 'DB_PASSWORD' => 'synthetic_ci_only',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "HOLD lesson reorder PG: fixed disposable GitHub Actions database required.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD lesson reorder PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD lesson reorder PG: connection URL override prohibited.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "HOLD lesson reorder PG: pdo_pgsql required.\n");
    exit(2);
}

function reorderPgCheck(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException('Lesson reorder check failed.');
    }
    echo 'PASS lesson reorder PG: '.$label.PHP_EOL;
}

function reorderPgOnPeer(callable $operation): mixed
{
    $previous = DB::getDefaultConnection();
    DB::setDefaultConnection('c129_reorder_peer');
    try {
        return $operation();
    } finally {
        DB::setDefaultConnection($previous);
    }
}

/** Only three fixed row-lock statements, always rolled back. */
function reorderPgBlocked(PDO $peer, string $kind, int $id): bool
{
    $sql = match ($kind) {
        'course' => 'SELECT id FROM educational_courses WHERE id = ? FOR UPDATE',
        'version' => 'SELECT id FROM educational_course_versions WHERE id = ? FOR UPDATE',
        'lesson' => 'SELECT id FROM educational_lessons WHERE id = ? FOR UPDATE',
        default => throw new RuntimeException('Unsupported order lock probe.'),
    };
    $peer->beginTransaction();
    try {
        try {
            $statement = $peer->prepare($sql);
            $statement->execute([$id]);
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

function reorderPgOrder(int $version): array
{
    return DB::table('educational_lessons')->where('educational_course_version_id', $version)
        ->orderBy('sort_order')->orderBy('id')->get(['id', 'sort_order'])
        ->map(static fn ($row): array => ['id' => (int) $row->id, 'sort_order' => (int) $row->sort_order])->all();
}

function reorderPgRows(int $version): array
{
    return DB::table('educational_lessons')->where('educational_course_version_id', $version)
        ->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all();
}

$stage = 'bootstrap';
$peer = null;
$organizations = [];
$courses = [];
$versions = [];
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $configuration = $app->make('config');
    reorderPgCheck($configuration->get('database.default') === 'pgsql'
        && empty($configuration->get('database.connections.pgsql.url'))
        && $configuration->get('database.connections.pgsql.host') === '127.0.0.1'
        && (string) $configuration->get('database.connections.pgsql.port') === '5432'
        && $configuration->get('database.connections.pgsql.database') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.username') === 'uni_ci'
        && $configuration->get('database.connections.pgsql.password') === 'synthetic_ci_only'
        && $configuration->get('app.key') === 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        'effective settings match only the disposable laboratory before the first query');
    $stage = 'fixture_guard';
    $keys = ['imagine-editorial', 'qa-order-foreign'];
    reorderPgCheck(!DB::table('educational_organizations')->whereIn('synthetic_key', $keys)->exists(),
        'owned fixtures run before editorial seeding without overwriting organizations');
    $configuration->set('database.connections.c129_reorder_peer', $configuration->get('database.connections.pgsql'));
    $peer = DB::connection('c129_reorder_peer')->getPdo();
    $peer->exec("SET lock_timeout = '250ms'");
    $peer->exec("SET statement_timeout = '1500ms'");
    DB::statement("SET lock_timeout = '1000ms'");
    DB::statement("SET statement_timeout = '5000ms'");
    reorderPgCheck((int) DB::selectOne('SELECT pg_backend_pid() AS pid')->pid
        !== (int) $peer->query('SELECT pg_backend_pid()')->fetchColumn(),
        'repository and peer are independent PostgreSQL sessions with bounded lock waits');

    try {
        $stage = 'fixtures';
        $fixture = DB::transaction(static function () use (&$organizations, &$courses, &$versions): array {
            foreach (['imagine-editorial', 'qa-order-foreign'] as $key) {
                $organizations[$key] = (int) DB::table('educational_organizations')->insertGetId([
                    'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $own = null;
            foreach (['own', 'foreign', 'unshared'] as $kind) {
                $course = (int) DB::table('educational_courses')->insertGetId([
                    'educational_organization_id' => $organizations[$kind === 'foreign' ? 'qa-order-foreign' : 'imagine-editorial'],
                    'slug' => 'qa-order-'.$kind, 'title' => 'Curso sintético de ordem',
                    'category' => 'metodologia', 'sort_order' => 9999,
                    'is_shared' => $kind !== 'unshared', 'is_published' => false,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $courses[$kind] = $course;
                if ($kind === 'own') {
                    $archive = (int) DB::table('educational_course_versions')->insertGetId([
                        'educational_course_id' => $course, 'version' => 1, 'status' => 'archived',
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    $versions[] = $archive;
                    DB::table('educational_lessons')->insert([
                        'educational_course_version_id' => $archive, 'slug' => 'historical-lesson',
                        'title' => 'Título histórico literal', 'body' => 'Conteúdo histórico que a operação não pode reescrever.',
                        'sort_order' => 9999, 'is_published' => false, 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                $version = (int) DB::table('educational_course_versions')->insertGetId([
                    'educational_course_id' => $course, 'version' => $kind === 'own' ? 2 : 1, 'status' => 'draft',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $versions[] = $version;
                $rows = [];
                for ($index = 0, $count = $kind === 'own' ? 600 : 2; $index < $count; $index++) {
                    $rows[] = [
                        'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                        'title' => 'Aula literal '.$index, 'body' => "Material sintético {$index}.\n\nPreservar este conteúdo.",
                        'sort_order' => 0, 'is_published' => false,
                        'created_at' => '2026-11-17 10:00:00', 'updated_at' => '2026-11-17 10:00:00',
                    ];
                }
                foreach (array_chunk($rows, 100) as $chunk) {
                    DB::table('educational_lessons')->insert($chunk);
                }
                if ($kind === 'own') {
                    $own = ['course' => $course, 'version' => $version, 'archive' => $archive];
                }
            }
            return $own;
        });
        $repository = $app->make(UniversityCatalogRepository::class);
        $grant = PortalGrant::allow('imagine-editorial', 'qa-order-editor', PortalAccessGate::MANAGE, 1, time() + 60);
        $live = static fn (): PortalGrant => $grant;
        $course = $fixture['course'];
        $version = $fixture['version'];
        $expected = reorderPgOrder($version);
        $lesson = $expected[1]['id'];
        $beforeRows = reorderPgRows($version);
        $archiveRows = reorderPgRows($fixture['archive']);
        $preflight = $repository->publicationPreflight($grant, $course);
        reorderPgCheck(is_array($preflight) && $preflight['ready'] === true,
            'real publication preflight captures the original tied draft');

        $record = false;
        $updates = 0;
        $maxBindings = 0;
        $auditInserts = 0;
        $fault = null;
        $faultObserved = false;
        DB::listen(static function (QueryExecuted $query) use (&$record, &$updates, &$maxBindings, &$auditInserts,
            &$fault, &$faultObserved): void {
            if (!$record) {
                return;
            }
            if (preg_match('/^\s*update\s+educational_lessons/i', $query->sql)) {
                $updates++;
                $maxBindings = max($maxBindings, count($query->bindings));
                if ($fault === 'chunk') {
                    $fault = null;
                    $faultObserved = true;
                    throw new RuntimeException('Synthetic order failure after a completed chunk.');
                }
            }
            if (str_contains($query->sql, 'educational_audit_events') && preg_match('/^\s*insert/i', $query->sql)) {
                $auditInserts++;
            }
        });

        $stage = 'locked_move';
        $decisions = 0;
        $locks = [];
        $competingMoveBlocked = false;
        $publicationBlocked = false;
        $record = true;
        $moved = $repository->reorderDraftLessons($grant, $course, $lesson, 'up', $expected,
            static function () use ($peer, $repository, $grant, $course, $version, $expected, $lesson, $preflight,
                &$decisions, &$locks, &$competingMoveBlocked, &$publicationBlocked): PortalGrant {
                $decisions++;
                reorderPgCheck(DB::transactionLevel() > 0, 'live authority decision remains inside the editorial transaction');
                if ($decisions === 1) {
                    $locks = [
                        reorderPgBlocked($peer, 'course', $course),
                        reorderPgBlocked($peer, 'version', $version),
                        reorderPgBlocked($peer, 'lesson', $expected[0]['id']),
                        reorderPgBlocked($peer, 'lesson', $expected[count($expected) - 1]['id']),
                    ];
                    try {
                        reorderPgOnPeer(static fn () => $repository->reorderDraftLessons($grant, $course, $lesson, 'up',
                            $expected, static fn () => $grant));
                    } catch (QueryException $error) {
                        $competingMoveBlocked = ($error->errorInfo[0] ?? null) === '55P03';
                    }
                    try {
                        reorderPgOnPeer(static fn () => $repository->setPublished($grant, $course, true,
                            $preflight['content_hash'], static fn () => $grant));
                    } catch (QueryException $error) {
                        $publicationBlocked = ($error->errorInfo[0] ?? null) === '55P03';
                    }
                }
                return $grant;
            });
        $record = false;
        reorderPgCheck(is_array($moved) && $moved['changed'] === true && $moved['course_version'] === 2
            && $decisions === 2 && $locks === [true, true, true, true] && $competingMoveBlocked && $publicationBlocked,
            'the real competing move and publication wait on the course while all version lessons remain locked');
        reorderPgCheck($updates === 3 && $maxBindings <= 770 && $auditInserts === 1
            && $moved['order'] === reorderPgOrder($version)
            && $moved['order'][0]['id'] === $lesson && $moved['order'][599]['sort_order'] === 599,
            'six hundred tied lessons become the exact adjacent destination using three parameterized batches and one audit');
        $afterRows = reorderPgRows($version);
        foreach ($beforeRows as $index => $row) {
            foreach (['id', 'educational_course_version_id', 'slug', 'title', 'body', 'is_published', 'created_at'] as $field) {
                if ($row[$field] !== $afterRows[$index][$field]) {
                    throw new RuntimeException('Editorial content changed during order probe.');
                }
            }
        }
        reorderPgCheck($archiveRows === reorderPgRows($fixture['archive']),
            'draft content and archived lesson references are preserved byte for byte');

        $stage = 'post_lock_compare';
        $beforeNoop = reorderPgRows($version);
        $updates = 0;
        $auditInserts = 0;
        $record = true;
        $duplicate = reorderPgOnPeer(static fn () => $repository->reorderDraftLessons(
            $grant, $course, $lesson, 'up', $expected, $live));
        $record = false;
        reorderPgCheck(is_array($duplicate) && $duplicate === [...$moved, 'changed' => false]
            && $updates === 0 && $auditInserts === 0 && $beforeNoop === reorderPgRows($version),
            'the identical intention on the second session becomes a timestamp-preserving no-op after lock release');
        reorderPgCheck(reorderPgOnPeer(static fn () => $repository->reorderDraftLessons($grant, $course,
            $expected[3]['id'], 'up', $expected, $live)) === 'draft_order_changed'
            && reorderPgOnPeer(static fn () => $repository->setPublished($grant, $course, true, $preflight['content_hash'], $live)) === false,
            'another old intention and an old publication hash cannot act on the changed draft');

        $stage = 'rollback_after_chunk';
        DB::table('educational_lessons')->where('educational_course_version_id', $version)->update(['sort_order' => 0]);
        $expected = reorderPgOrder($version);
        $beforeFailure = reorderPgRows($version);
        $auditBefore = DB::table('educational_audit_events')->where('educational_organization_id', $organizations['imagine-editorial'])->count();
        $fault = 'chunk';
        $faultObserved = false;
        $record = true;
        $failed = false;
        try {
            $repository->reorderDraftLessons($grant, $course, $lesson, 'up', $expected, $live);
        } catch (RuntimeException) {
            $failed = $faultObserved;
        } finally {
            $record = false;
            $fault = null;
        }
        reorderPgCheck($failed && $beforeFailure === reorderPgRows($version)
            && $auditBefore === DB::table('educational_audit_events')->where('educational_organization_id', $organizations['imagine-editorial'])->count(),
            'an exception after the first completed batch rolls back all order and timestamp changes');

        $stage = 'rollback_after_audit';
        $decisions = 0;
        $sawUncommittedAudit = false;
        $rejected = $repository->reorderDraftLessons($grant, $course, $lesson, 'up', $expected,
            static function () use ($grant, &$decisions, &$sawUncommittedAudit, $auditBefore, $organizations): PortalGrant {
                $decisions++;
                if ($decisions === 2) {
                    $sawUncommittedAudit = DB::transactionLevel() > 0
                        && DB::table('educational_audit_events')->where('educational_organization_id',
                            $organizations['imagine-editorial'])->count() === $auditBefore + 1;
                    return PortalGrant::deny('revoked');
                }
                return $grant;
            });
        reorderPgCheck($rejected === 'access_denied' && $decisions === 2 && $sawUncommittedAudit
            && $beforeFailure === reorderPgRows($version)
            && $auditBefore === DB::table('educational_audit_events')->where('educational_organization_id', $organizations['imagine-editorial'])->count(),
            'a live denial after all batches and the actual audit insert rolls the entire transaction back');

        $stage = 'scope_and_boundary';
        foreach (['foreign', 'unshared'] as $kind) {
            reorderPgCheck($repository->reorderDraftLessons($grant, $courses[$kind], $lesson, 'up', $expected, $live) === 'not_found',
                'out-of-scope course cannot expose or reorder its draft');
        }
        $boundary = $repository->reorderDraftLessons($grant, $course, $expected[0]['id'], 'up', $expected, $live);
        reorderPgCheck(is_array($boundary) && $boundary['changed'] === false && $boundary['order'] === $expected
            && $beforeFailure === reorderPgRows($version),
            'a first-position no-op preserves tied values without normalization');
        reorderPgCheck($archiveRows === reorderPgRows($fixture['archive'])
            && DB::table('educational_courses')->where('id', $course)->value('is_published') === false,
            'the publication boundary and historical version remain unchanged');
    } finally {
        $operationStage = $stage;
        $stage = 'cleanup';
        DB::setDefaultConnection('pgsql');
        while (DB::connection('c129_reorder_peer')->transactionLevel() > 0) {
            DB::connection('c129_reorder_peer')->rollBack();
        }
        if ($peer instanceof PDO && $peer->inTransaction()) {
            $peer->rollBack();
        }
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        DB::transaction(static function () use ($organizations, $courses, $versions): void {
            if ($organizations !== []) {
                DB::table('educational_audit_events')->whereIn('educational_organization_id', array_values($organizations))->delete();
            }
            if ($versions !== []) {
                DB::table('educational_lessons')->whereIn('educational_course_version_id', $versions)->delete();
                DB::table('educational_course_versions')->whereIn('id', $versions)->delete();
            }
            if ($courses !== []) {
                DB::table('educational_courses')->whereIn('id', array_values($courses))->delete();
            }
            if ($organizations !== []) {
                DB::table('educational_organizations')->whereIn('id', array_values($organizations))->delete();
            }
        });
        DB::disconnect('c129_reorder_peer');
        $stage = $operationStage;
    }
    echo "PASS lesson reorder PG: actual repository, bounded chunks, two sessions, conflicts and rollback; owned fixtures removed.\n";
} catch (Throwable $error) {
    // Never print SQL, credentials, payloads, actor keys or stack traces.
    fwrite(STDERR, 'FAIL lesson reorder PG at '.$stage.' ('.get_class($error).").\n");
    exit(1);
}
