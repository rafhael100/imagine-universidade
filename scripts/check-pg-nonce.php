<?php

declare(strict_types=1);

/** Single-use nonce check in a disposable PG18 transaction, always rollback. */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalSignedClaimCandidate;
use App\Domain\Access\PortalSignedNonceReplayFence;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

$env = [
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci',
    'DB_USERNAME' => 'uni_ci',
    'DB_PASSWORD' => 'synthetic_ci_only',
];
foreach ($env as $key => $expected) {
    if (getenv($key) !== $expected) {
        fwrite(STDERR, "FAIL: PostgreSQL nonce test is permitted only in synthetic CI.\n");
        exit(2);
    }
}
foreach (['.env', '.env.production', '.env.testing', 'ops/staging/.env.staging'] as $file) {
    if (file_exists(dirname(__DIR__).'/'.$file) || is_link(dirname(__DIR__).'/'.$file)) {
        fwrite(STDERR, "HOLD nonce PG: environment files prohibited.\n");
        exit(2);
    }
}
foreach (['DB_URL', 'DATABASE_URL'] as $name) {
    if (!in_array(getenv($name), [false, ''], true)) {
        fwrite(STDERR, "HOLD nonce PG: connection URL override prohibited.\n");
        exit(2);
    }
}

$pdo = null;
$connection = null;
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $configuration = $app->make('config');
    if ($configuration->get('database.default') !== 'pgsql'
        || !empty($configuration->get('database.connections.pgsql.url'))
        || $configuration->get('database.connections.pgsql.host') !== '127.0.0.1'
        || (string) $configuration->get('database.connections.pgsql.port') !== '5432'
        || $configuration->get('database.connections.pgsql.database') !== 'uni_ci'
        || $configuration->get('database.connections.pgsql.username') !== 'uni_ci'
        || $configuration->get('database.connections.pgsql.password') !== 'synthetic_ci_only') {
        throw new RuntimeException('Effective Laravel connection is not the disposable laboratory.');
    }

    $pdo = new PDO(
        'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci', 'synthetic_ci_only',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    // Exercise the actual fence on the exact PDO transaction below. Reads
    // and writes cannot escape to another configured database connection.
    $connection = DB::connection();
    $connection->setPdo($pdo)->setReadPdo($pdo);

    // Track the transaction in Laravel too: its lost-connection handler must
    // never reconnect and replay a query outside this rollback-only scope.
    $connection->beginTransaction();
    if ($connection->transactionLevel() !== 1 || !$pdo->inTransaction()
        || $connection->getPdo() !== $pdo || $connection->getReadPdo() !== $pdo) {
        throw new RuntimeException('Nonce probe is not using one tracked PDO transaction.');
    }
    $pdo->exec("SET LOCAL statement_timeout = '5000ms'");
    $stmt = $pdo->prepare(
        'INSERT INTO educational_portal_replay_nonces
          (nonce_sha256,expires_at_epoch,consumed_at)
          VALUES (?,?,CURRENT_TIMESTAMP)
          ON CONFLICT (nonce_sha256) DO NOTHING RETURNING id'
    );
    $firstHash = hash('sha256', str_repeat('a', 32));
    $secondHash = hash('sha256', str_repeat('b', 32));
    $expiry = 1800000030;

    $stmt->execute([$firstHash, $expiry]);
    $first = $stmt->fetchColumn();
    if ($first === false) {
        throw new RuntimeException('First nonce was not accepted.');
    }

    $stmt->execute([$firstHash, $expiry]);
    if ($stmt->fetchColumn() !== false) {
        throw new RuntimeException('Replay nonce was accepted.');
    }

    $stmt->execute([$secondHash, $expiry]);
    if ($stmt->fetchColumn() === false) {
        throw new RuntimeException('Independent nonce was rejected.');
    }

    $count = (int) $pdo->query(
        'SELECT COUNT(*) FROM educational_portal_replay_nonces'
    )->fetchColumn();
    if ($count !== 2) {
        throw new RuntimeException('Nonce count is not 2.');
    }

    $uniqueIndex = $pdo->query(
        "SELECT indexdef FROM pg_indexes
          WHERE schemaname='public' AND indexname='edu_portal_nonce_sha256_uq'"
    )->fetchColumn();
    if (!is_string($uniqueIndex) || !str_contains($uniqueIndex, 'UNIQUE INDEX')) {
        throw new RuntimeException('Unique nonce index not installed.');
    }

    // C148: PostgreSQL itself delays the INSERT, exercising the production
    // class after a real SQL wait. This is a deterministic delay, not a
    // claim that competing-session lock behavior was tested here. Function,
    // trigger and nonce rows are all owned by this rollback-only transaction.
    $pdo->exec(<<<'SQL'
        CREATE FUNCTION pg_temp.uni_nonce_delay_c148() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            PERFORM pg_sleep(1.1);
            RETURN NEW;
        END;
        $$
        SQL);
    $pdo->exec('CREATE TRIGGER uni_nonce_delay_c148
        BEFORE INSERT ON educational_portal_replay_nonces
        FOR EACH ROW EXECUTE FUNCTION pg_temp.uni_nonce_delay_c148()');
    $fence = new PortalSignedNonceReplayFence();
    $candidate = static fn (string $nonce, int $expiry, string $company = 'synthetic-company-a') =>
        new PortalSignedClaimCandidate($company, 'synthetic-person-a', PortalAccessGate::VIEW,
            3, 1799999995, $expiry, $nonce);
    $lateNonce = str_repeat('c', 32);
    $lateHash = hash('sha256', $lateNonce);
    $startedAt = hrtime(true);
    $accepted = $fence->reserveOnce($candidate($lateNonce, 1800000001), 1800000000);
    if ($accepted || hrtime(true) - $startedAt < 1_000_000_000) {
        throw new RuntimeException('An expired claim survived the real delayed INSERT.');
    }
    $late = DB::table('educational_portal_replay_nonces')->where('nonce_sha256', $lateHash)->first();
    if ($late === null || (int) $late->expires_at_epoch !== 1800000001) {
        throw new RuntimeException('Late response released or changed the consumed nonce.');
    }
    if (!$fence->reserveOnce($candidate(str_repeat('d', 32), 1800000030), 1800000000)) {
        throw new RuntimeException('A still-valid claim failed after the real delayed INSERT.');
    }
    $pdo->exec('DROP TRIGGER uni_nonce_delay_c148 ON educational_portal_replay_nonces');
    if ($fence->reserveOnce($candidate($lateNonce, 1800000030, 'synthetic-company-b'), 1800000000)
        || DB::table('educational_portal_replay_nonces')->count() !== 4
        || (array) DB::table('educational_portal_replay_nonces')
            ->where('nonce_sha256', $lateHash)->first() !== (array) $late) {
        throw new RuntimeException('A late nonce could be replayed or overwritten.');
    }

    if ($connection->transactionLevel() !== 1 || !$pdo->inTransaction()
        || $connection->getPdo() !== $pdo || $connection->getReadPdo() !== $pdo) {
        throw new RuntimeException('Nonce probe escaped its tracked PDO transaction.');
    }
    $connection->rollBack();
    if ($connection->transactionLevel() !== 0 || $pdo->inTransaction()
        || (int) $pdo->query('SELECT COUNT(*) FROM educational_portal_replay_nonces')->fetchColumn() !== 0
        || $pdo->query("SELECT to_regprocedure('pg_temp.uni_nonce_delay_c148()')")->fetchColumn() !== null) {
        throw new RuntimeException('Rollback did not restore the nonce laboratory.');
    }
    echo "PASS: PostgreSQL nonce first use, replay rejection, independent use, unique index, delayed expiry and retained single-use hash; ROLLED BACK.\n";
} catch (Throwable) {
    try {
        if ($connection !== null && $connection->transactionLevel() > 0) {
            $connection->rollBack();
        }
    } catch (Throwable) {
        // A dead connection may prevent explicit cleanup; still report failure.
    }
    try {
        if ($pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
    } catch (Throwable) {
        // Last-resort cleanup must not hide the original laboratory failure.
    }
    fwrite(STDERR, "FAIL: synthetic PostgreSQL nonce contract test failed.\n");
    exit(1);
}
