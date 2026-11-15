<?php

declare(strict_types=1);

/**
 * Read-only schema inspection after Laravel migrations in disposable PG18.
 * Never connect to a server or database other than the fixed synthetic CI pair.
 */
function abortCheck(string $message): never
{
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
}

$expected = [
    'educational_courses|educational_organizations',
    'educational_course_versions|educational_courses',
    'educational_lessons|educational_course_versions',
    'educational_lesson_progress|educational_organizations',
    'educational_lesson_progress|educational_lessons',
    'educational_audit_events|educational_organizations',
];

if (
    getenv('APP_ENV') !== 'testing'
    || getenv('DB_CONNECTION') !== 'pgsql'
    || getenv('DB_HOST') !== '127.0.0.1'
    || getenv('DB_PORT') !== '5432'
    || getenv('DB_DATABASE') !== 'uni_ci'
    || getenv('DB_USERNAME') !== 'uni_ci'
    || getenv('DB_PASSWORD') !== 'synthetic_ci_only'
) {
    abortCheck('Database context is not the approved disposable test schema.');
}

if (!extension_loaded('pdo_pgsql')) {
    abortCheck('PHP extension pdo_pgsql is missing.');
}

try {
    $pdo = new PDO(
        'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3',
        'uni_ci',
        'synthetic_ci_only',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );

    $constraints = $pdo->query(
        "SELECT child.relname AS child, parent.relname AS parent,
                c.confdeltype AS delete_action
         FROM pg_constraint c
         JOIN pg_class child ON child.oid = c.conrelid
         JOIN pg_class parent ON parent.oid = c.confrelid
         JOIN pg_namespace ns ON ns.oid = child.relnamespace
         WHERE c.contype = 'f' AND ns.nspname = 'public'"
    )->fetchAll(PDO::FETCH_ASSOC);

    $actionByRelation = [];
    foreach ($constraints as $row) {
        $key = $row['child'].'|'.$row['parent'];
        if (!isset($actionByRelation[$key])) {
            $actionByRelation[$key] = [];
        }
        $actionByRelation[$key][] = $row['delete_action'];
    }

    foreach ($expected as $key) {
        $actions = $actionByRelation[$key] ?? [];
        if (count($actions) !== 1 || $actions[0] !== 'r') {
            abortCheck("Foreign key {$key} must be ON DELETE RESTRICT exactly once.");
        }
        echo "PASS FK RESTRICT {$key}\n";
    }

    foreach ([
        'edu_one_published_version_per_course_idx' => 'published',
        'edu_one_draft_version_per_course_idx' => 'draft',
    ] as $indexName => $status) {
        $query = $pdo->prepare(
            "SELECT indexdef FROM pg_indexes
             WHERE schemaname = 'public' AND indexname = :index_name"
        );
        $query->execute(['index_name' => $indexName]);
        $definition = $query->fetchColumn();
        if (
            !is_string($definition)
            || !str_contains($definition, 'UNIQUE INDEX')
            || !str_contains($definition, 'WHERE')
            || !str_contains($definition, $status)
        ) {
            abortCheck("Partial unique index {$indexName} is missing or malformed.");
        }
        echo "PASS partial UNIQUE {$indexName}\n";
    }

    echo "\n8 PostgreSQL schema invariants verified. No records were mutated.\n";
} catch (Throwable $e) {
    // The schema checker must never log connection secrets or exception trace.
    abortCheck('PostgreSQL connection/schema inspection failed.');
}
