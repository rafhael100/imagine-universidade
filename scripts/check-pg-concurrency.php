<?php

declare(strict_types=1);

/**
 * Two real PDO connections to disposable PostgreSQL18, never a production DB.
 * Demonstrates that the row-level lock used by editorial publish/update
 * prevents a second writer from silently racing the first transaction.
 */
function concurrencyFail(string $message): never
{
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
}

$expected = [
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci',
    'DB_USERNAME' => 'uni_ci',
    'DB_PASSWORD' => 'synthetic_ci_only',
];
foreach ($expected as $name => $value) {
    if (getenv($name) !== $value) {
        concurrencyFail('refusing non-disposable connection context.');
    }
}
if (!extension_loaded('pdo_pgsql')) {
    concurrencyFail('PostgreSQL PDO is unavailable.');
}

$connect = static fn (): PDO => new PDO(
    'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
    'uni_ci',
    'synthetic_ci_only',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false],
);

$orgId = null;
$courseId = null;
$pdoA = null;
$pdoB = null;
$passed = false;
try {
    try {
        $pdoA = $connect();
        $pdoB = $connect();
        $backendA = $pdoA->query('SELECT pg_backend_pid()')->fetchColumn();
        $backendB = $pdoB->query('SELECT pg_backend_pid()')->fetchColumn();
        if ($backendA === $backendB) {
            throw new RuntimeException('Two separate connections are required.');
        }

        $exists = (int) $pdoA->query(
            "SELECT COUNT(*) FROM educational_organizations
             WHERE synthetic_key = 'qa-editorial-lock-only'"
        )->fetchColumn();
        if ($exists !== 0) {
            throw new RuntimeException('Synthetic fixture must not preexist.');
        }

        $pdoA->beginTransaction();
        $orgId = (int) $pdoA->query(
            "INSERT INTO educational_organizations (synthetic_key,created_at,updated_at)
             VALUES ('qa-editorial-lock-only',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
             RETURNING id"
        )->fetchColumn();
        $create = $pdoA->prepare(
            "INSERT INTO educational_courses
             (educational_organization_id,slug,title,category,summary,
              sort_order,is_shared,is_published,created_at,updated_at)
             VALUES (:org,'qa-editorial-lock-only','Initial synthetic title',
              'metodologia',NULL,0,TRUE,FALSE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
             RETURNING id"
        );
        $create->execute(['org' => $orgId]);
        $courseId = (int) $create->fetchColumn();
        $pdoA->commit();

        // Connection A takes the exact row lock used by Laravel editorial
        // state changes. Connection B must not be able to update concurrently.
        $pdoA->beginTransaction();
        $lock = $pdoA->prepare('SELECT id FROM educational_courses WHERE id = :id FOR UPDATE');
        $lock->execute(['id' => $courseId]);
        if ((int) $lock->fetchColumn() !== $courseId) {
            throw new RuntimeException('Editorial lock fixture missing.');
        }

        $pdoB->beginTransaction();
        $pdoB->exec("SET LOCAL lock_timeout = '250ms'");
        $update = $pdoB->prepare(
            'UPDATE educational_courses SET title = :title WHERE id = :id'
        );
        $blocked = false;
        try {
            $update->execute(['title' => 'MUST NOT COMMIT', 'id' => $courseId]);
        } catch (PDOException $exception) {
            $blocked = $exception->getCode() === '55P03';
        }
        $pdoB->rollBack();
        if (!$blocked) {
            throw new RuntimeException('Second connection bypassed row lock or returned unexpected error.');
        }

        $titleWhileLocked = $pdoA->prepare(
            'SELECT title FROM educational_courses WHERE id = :id'
        );
        $titleWhileLocked->execute(['id' => $courseId]);
        if ($titleWhileLocked->fetchColumn() !== 'Initial synthetic title') {
            throw new RuntimeException('Timed-out writer mutated locked content.');
        }
        $pdoA->rollBack();

        // Once A releases its lock, B can perform the ordinary write.
        $pdoB->beginTransaction();
        $update->execute(['title' => 'After lock release', 'id' => $courseId]);
        if ($update->rowCount() !== 1) {
            throw new RuntimeException('Expected a single editorial row update.');
        }
        $pdoB->commit();
        $verify = $pdoA->prepare('SELECT title FROM educational_courses WHERE id = :id');
        $verify->execute(['id' => $courseId]);
        if ($verify->fetchColumn() !== 'After lock release') {
            throw new RuntimeException('Recovered writer commit missing.');
        }

        $passed = true;
    } finally {
        // A failed test must never leave test rows or open transactions.
        if ($pdoB instanceof PDO && $pdoB->inTransaction()) {
            $pdoB->rollBack();
        }
        if ($pdoA instanceof PDO && $pdoA->inTransaction()) {
            $pdoA->rollBack();
        }
        if ($pdoA instanceof PDO && $courseId !== null) {
            $delete = $pdoA->prepare('DELETE FROM educational_courses WHERE id = :id');
            $delete->execute(['id' => $courseId]);
        }
        if ($pdoA instanceof PDO && $orgId !== null) {
            $delete = $pdoA->prepare('DELETE FROM educational_organizations WHERE id = :id');
            $delete->execute(['id' => $orgId]);
        }
    }
} catch (Throwable) {
    concurrencyFail('two-connection PostgreSQL18 lock test failed in disposable schema.');
}

if (!$passed) {
    concurrencyFail('concurrency test did not reach its final assertion.');
}

echo "PASS: two independent PostgreSQL18 sessions; writer B timed out under A row lock, then succeeded after release. Test rows removed.\n";
