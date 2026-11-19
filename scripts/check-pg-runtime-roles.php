<?php

declare(strict_types=1);

/**
 * QA ONLY: provisional role privilege matrix in disposable PG18.
 * Never runs against any real DB, server, or customer records.
 */
function rejectRole(string $message): never
{
    fwrite(STDERR, "HOLD synthetic PG role QA: ".$message.PHP_EOL);
    exit(2);
}

$env = [
    'APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => '127.0.0.1', 'DB_PORT' => '5432',
    'DB_DATABASE' => 'uni_ci', 'DB_USERNAME' => 'uni_ci',
    'DB_PASSWORD' => 'synthetic_ci_only',
];
foreach ($env as $key => $value) {
    if (getenv($key) !== $value) {
        rejectRole('Only the exact disposable CI database may be used.');
    }
}
if (!extension_loaded('pdo_pgsql')) {
    rejectRole('PGSQL extension missing.');
}

$ownerDsn = 'pgsql:host=127.0.0.1;port=5432;dbname=uni_ci;connect_timeout=3';
$fakeRole = 'uni_university_runtime_ci';
$fakePassword = 'FAKE_CI_ROLE_ONLY_not_a_production_password_77';
$owner = new PDO($ownerDsn, 'uni_ci', 'synthetic_ci_only', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$roleCreated = false;
$runtime = null;
try {
    $exists = $owner->query("SELECT 1 FROM pg_roles WHERE rolname='uni_university_runtime_ci'")
        ->fetchColumn();
    if ($exists !== false) {
        rejectRole('Synthetic runtime role unexpectedly exists before test.');
    }

    $owner->exec("CREATE ROLE {$fakeRole} LOGIN PASSWORD '{$fakePassword}'");
    $roleCreated = true;

    $file = dirname(__DIR__).'/ops/staging/role-grants-candidate.sql';
    $candidate = file_get_contents($file);
    if (!is_string($candidate) ||
        substr_count($candidate, 'uni_stage_runtime') < 5 ||
        !str_contains($candidate, 'public.educational_audit_events') ||
        !str_contains($candidate, 'public.educational_course_favorites') ||
        !str_contains($candidate, 'public.educational_reading_positions') ||
        !str_contains($candidate, 'public.sessions')) {
        rejectRole('Runtime grant matrix is missing or incomplete.');
    }
    $synthetic = str_replace(
        ['uni_stage_runtime', 'imagine_uni_stage'],
        [$fakeRole, 'uni_ci'],
        $candidate,
    );
    $owner->exec($synthetic);

    $expect = [
        ['public.educational_organizations', 'SELECT', true],
        ['public.educational_organizations', 'INSERT', true],
        ['public.educational_organizations', 'DELETE', false],
        ['public.educational_courses', 'DELETE', true],
        ['public.educational_lessons', 'UPDATE', true],
        ['public.educational_lesson_progress', 'INSERT', true],
        ['public.educational_lesson_progress', 'UPDATE', false],
        ['public.educational_lesson_progress', 'DELETE', false],
        ['public.educational_course_favorites', 'SELECT', true],
        ['public.educational_course_favorites', 'INSERT', true],
        ['public.educational_course_favorites', 'DELETE', true],
        ['public.educational_course_favorites', 'UPDATE', false],
        ['public.educational_reading_positions', 'SELECT', true],
        ['public.educational_reading_positions', 'INSERT', true],
        ['public.educational_reading_positions', 'UPDATE', true],
        ['public.educational_reading_positions', 'DELETE', false],
        ['public.educational_audit_events', 'INSERT', true],
        ['public.educational_audit_events', 'UPDATE', false],
        ['public.educational_audit_events', 'DELETE', false],
        ['public.educational_portal_replay_nonces', 'INSERT', true],
        ['public.educational_portal_replay_nonces', 'SELECT', false],
        ['public.educational_portal_replay_nonces', 'DELETE', false],
        ['public.sessions', 'DELETE', true],
        ['public.migrations', 'SELECT', false],
    ];
    $stmt = $owner->prepare(
        "SELECT has_table_privilege(:role, :resource, :privilege)"
    );
    foreach ($expect as [$resource, $permission, $allowed]) {
        $stmt->execute([
            'role' => $fakeRole,
            'resource' => $resource,
            'privilege' => $permission,
        ]);
        $actual = $stmt->fetchColumn();
        $isAllowed = $actual === true || $actual === 't' || $actual === 1;
        if ($isAllowed !== $allowed) {
            rejectRole('Grant matrix mismatch: '.$resource.' '.$permission);
        }
    }
    $stmt = $owner->prepare(
        "SELECT has_schema_privilege(:role, 'public', 'CREATE')"
    );
    $stmt->execute(['role' => $fakeRole]);
    $hasCreate = $stmt->fetchColumn();
    if ($hasCreate === true || $hasCreate === 't' || $hasCreate === 1) {
        rejectRole('Runtime must not create schema objects.');
    }

    $runtime = new PDO($ownerDsn, $fakeRole, $fakePassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $runtime->query('SELECT COUNT(*) FROM public.educational_courses')->fetchColumn();
    $runtime->query('SELECT COUNT(*) FROM public.educational_course_favorites')->fetchColumn();
    $runtime->exec('DELETE FROM public.educational_course_favorites WHERE 1 = 0');
    $runtime->query('SELECT COUNT(*) FROM public.educational_reading_positions')->fetchColumn();
    $runtime->exec('UPDATE public.educational_reading_positions SET subject_key = subject_key WHERE 1 = 0');
    $runtime->exec(
        "INSERT INTO public.sessions (id, payload, last_activity)
         VALUES ('ci-runtime-role-session', 'synthetic', 1800000000)"
    );
    $runtime->exec(
        "DELETE FROM public.sessions WHERE id='ci-runtime-role-session'"
    );

    foreach ([
        'CREATE TABLE public.ci_runtime_privilege_escape (id int)',
        'DELETE FROM public.educational_audit_events WHERE 1 = 0',
        'UPDATE public.educational_lesson_progress SET id = id WHERE 1 = 0',
        'UPDATE public.educational_course_favorites SET subject_key = subject_key WHERE 1 = 0',
        'DELETE FROM public.educational_reading_positions WHERE 1 = 0',
    ] as $forbidden) {
        try {
            $runtime->exec($forbidden);
            rejectRole('Forbidden runtime SQL was unexpectedly accepted.');
        } catch (PDOException $exception) {
            if ($exception->getCode() !== '42501') {
                rejectRole('Unexpected SQL failure type for denied runtime statement.');
            }
        }
    }
    echo 'PASS: PG18 fake runtime role, 24 privilege assertions, no schema CREATE, audit/reading-position DELETE, progress/favorites UPDATE.'."\n";
} finally {
    $runtime = null;
    if ($roleCreated) {
        try {
            $owner->exec("DROP OWNED BY {$fakeRole}");
            $owner->exec("DROP ROLE {$fakeRole}");
        } catch (Throwable) {
            rejectRole('Disposable role cleanup failed.');
        }
    }
}
