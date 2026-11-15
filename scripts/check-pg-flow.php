<?php

declare(strict_types=1);

/**
 * Synthetic PostgreSQL 18 relational contract. READ/WRITE inside a single
 * ROLLED-BACK transaction, never a Laravel/Portal end-to-end authentication test.
 * Only run with the fixed disposable localhost database used by QA.
 */
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
        fwrite(STDERR, "FAIL: cannot run PG flow outside the synthetic CI database.\n");
        exit(2);
    }
}
if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "FAIL: pdo_pgsql is required.\n");
    exit(2);
}

function requireCondition(bool $condition, string $name): void
{
    if (!$condition) {
        throw new RuntimeException("Contract check failed: {$name}");
    }
    echo "PASS {$name}\n";
}

function insertId(PDO $pdo, string $sql, array $values = []): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    return (int) $stmt->fetchColumn();
}

function countWhere(PDO $pdo, string $sql, array $params): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}

function expectPgConstraint(PDO $pdo, string $sql, string $name, string $expectedState): void
{
    $pdo->exec('SAVEPOINT synthetic_constraint_check');
    try {
        $pdo->exec($sql);
        $pdo->exec('ROLLBACK TO SAVEPOINT synthetic_constraint_check');
        throw new RuntimeException("Unexpectedly accepted: {$name}");
    } catch (PDOException $error) {
        $state = (string) ($error->errorInfo[0] ?? $error->getCode());
        $pdo->exec('ROLLBACK TO SAVEPOINT synthetic_constraint_check');
        if ($state !== $expectedState) {
            // Apenas SQLSTATE é exibido; nunca registrar SQL, segredos ou dados reais.
            fwrite(STDERR, "Unexpected SQLSTATE for {$name}: {$state}; expected {$expectedState}\n");
        }
        requireCondition($state === $expectedState, $name);
    } finally {
        $pdo->exec('RELEASE SAVEPOINT synthetic_constraint_check');
    }
}

$pdo = null;
try {
    $pdo = new PDO(
        'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci',
        'synthetic_ci_only',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false],
    );
    $pdo->beginTransaction();

    $newOrg = "INSERT INTO educational_organizations (synthetic_key,created_at,updated_at)
               VALUES (?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id";
    $editorial = insertId($pdo, $newOrg, ['qa-synthetic-editorial']);
    $companyA = insertId($pdo, $newOrg, ['qa-synthetic-client-a']);
    $companyB = insertId($pdo, $newOrg, ['qa-synthetic-client-b']);

    $course = insertId($pdo,
        "INSERT INTO educational_courses
         (educational_organization_id,slug,title,category,is_shared,is_published,created_at,updated_at)
         VALUES (?,'qa-visitas-leads-clientes','QA metodologia','metodologia',true,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id",
        [$editorial]
    );
    $version = insertId($pdo,
        "INSERT INTO educational_course_versions
         (educational_course_id,version,status,created_at,updated_at)
         VALUES (?,1,'draft',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",
        [$course]
    );
    $lesson = insertId($pdo,
        "INSERT INTO educational_lessons
         (educational_course_version_id,slug,title,body,is_published,created_at,updated_at)
         VALUES (?,'qa-primeira-aula','Aula inicial','Conteúdo sintético para verificar o schema.',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id",
        [$version]
    );

    requireCondition(
        countWhere($pdo, "SELECT COUNT(*) FROM educational_courses
            WHERE id=? AND is_published=true", [$course]) === 0,
        'draft course not yet publicly listed'
    );

    $stmt = $pdo->prepare("UPDATE educational_lessons SET is_published=true WHERE id=?");
    $stmt->execute([$lesson]);
    $stmt = $pdo->prepare("UPDATE educational_course_versions SET status='published' WHERE id=?");
    $stmt->execute([$version]);
    $stmt = $pdo->prepare("UPDATE educational_courses SET is_published=true WHERE id=?");
    $stmt->execute([$course]);

    requireCondition(
        countWhere($pdo,
            "SELECT COUNT(*) FROM educational_lessons l
             JOIN educational_course_versions v ON v.id=l.educational_course_version_id
             JOIN educational_courses c ON c.id=v.educational_course_id
             WHERE l.id=? AND c.educational_organization_id=? AND
                   c.is_shared=true AND c.is_published=true AND
                   v.status='published' AND l.is_published=true",
            [$lesson, $editorial]
        ) === 1,
        'shared published lesson visible from editorial catalog'
    );

    $addProgress = $pdo->prepare(
        "INSERT INTO educational_lesson_progress
         (educational_organization_id,subject_key,educational_lesson_id,completed_at,created_at,updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (educational_organization_id,subject_key,educational_lesson_id) DO NOTHING"
    );
    $addProgress->execute([$companyA, 'qa-user-a', $lesson]);
    requireCondition($addProgress->rowCount() === 1, 'first completion inserted');

    $addProgress->execute([$companyA, 'qa-user-a', $lesson]);
    requireCondition($addProgress->rowCount() === 0, 'duplicate completion ignored');

    $addProgress->execute([$companyB, 'qa-user-b', $lesson]);
    requireCondition(
        $addProgress->rowCount() === 1 &&
        countWhere($pdo, "SELECT COUNT(*) FROM educational_lesson_progress
            WHERE educational_organization_id=? AND subject_key=? AND educational_lesson_id=?",
            [$companyB, 'qa-user-a', $lesson]) === 0,
        'distinct tenants have isolated progress'
    );

    expectPgConstraint(
        $pdo,
        "INSERT INTO educational_course_versions
         (educational_course_id,version,status,created_at,updated_at)
         VALUES ({$course},2,'published',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
        'two published versions cannot coexist',
        '23505'
    );

    expectPgConstraint(
        $pdo,
        "DELETE FROM educational_lessons WHERE id={$lesson}",
        'progress prevents deletion of published lesson',
        '23503'
    );

    $stmt = $pdo->prepare("UPDATE educational_lessons SET is_published=false WHERE id=?");
    $stmt->execute([$lesson]);
    $stmt = $pdo->prepare("UPDATE educational_course_versions SET status='archived' WHERE id=?");
    $stmt->execute([$version]);
    $stmt = $pdo->prepare("UPDATE educational_courses SET is_published=false WHERE id=?");
    $stmt->execute([$course]);

    $nextVersion = insertId($pdo,
        "INSERT INTO educational_course_versions
         (educational_course_id,version,status,created_at,updated_at)
         VALUES (?,2,'draft',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",
        [$course]
    );
    $nextLesson = insertId($pdo,
        "INSERT INTO educational_lessons
         (educational_course_version_id,slug,title,body,is_published,created_at,updated_at)
         VALUES (?,'qa-primeira-aula','Aula atualizada','Outra aula sintética com ID diferente.',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id",
        [$nextVersion]
    );
    requireCondition(
        $nextLesson !== $lesson &&
        countWhere($pdo, "SELECT COUNT(*) FROM educational_lesson_progress
            WHERE educational_lesson_id=?", [$lesson]) === 2 &&
        countWhere($pdo, "SELECT COUNT(*) FROM educational_lesson_progress
            WHERE educational_lesson_id=?", [$nextLesson]) === 0,
        'new draft preserves historic progress without inheritance'
    );

    $pdo->rollBack();
    echo "\nPASS: eight PostgreSQL synthetic relational checks; entire transaction ROLLED BACK.\n";
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Diagnóstico apenas da classe/SQLSTATE, sem divulgar mensagem SQL ou conexão.
    $safeCode = preg_match('/^[A-Za-z0-9]{1,10}$/', (string) $error->getCode())
        ? (string) $error->getCode() : 'unknown';
    fwrite(STDERR, 'FAIL: synthetic PostgreSQL relational checks did not complete ('
        .get_debug_type($error).', code '.$safeCode.").\n");
    exit(1);
}
