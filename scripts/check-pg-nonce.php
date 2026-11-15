<?php

declare(strict_types=1);

/** Single-use nonce check in a disposable PG18 transaction, always rollback. */
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

$pdo = null;
try {
    $pdo = new PDO(
        'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci', 'synthetic_ci_only',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );

    $pdo->beginTransaction();
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

    $pdo->rollBack();
    echo "PASS: PostgreSQL nonce first use, replay rejection, independent use and unique index; ROLLED BACK.\n";
} catch (Throwable) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "FAIL: synthetic PostgreSQL nonce contract test failed.\n");
    exit(1);
}
