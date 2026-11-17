<?php

declare(strict_types=1);

require_once __DIR__.'/LabGuard.php';
$stage = 'guard';
try {
    $lab = \Tests\Browser\LabGuard::environment('cli');
    $stage = 'input';
    $action = $argv[1] ?? '';
    if (!in_array($action, ['setup', 'verify'], true) || count($argv) !== 2) {
        throw new \RuntimeException('Explicit laboratory setup or verification required.');
    }
    if ($action === 'setup' && filesize($lab['database']) !== 0) {
        throw new \RuntimeException('Setup requires a newly created empty SQLite file.');
    }
    $stage = 'autoloader';
    require dirname(__DIR__, 2).'/vendor/autoload.php';
    $stage = 'application';
    $app = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $app->useStoragePath($lab['directory'].'/storage');
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $stage = 'framework_bootstrap';
    $kernel->bootstrap();
    $stage = 'configuration';
    \Tests\Browser\LabGuard::configured($app, $lab);
    if (!$app->make(\App\Domain\Access\PortalAuthority::class) instanceof \App\Domain\Access\UnavailablePortalAuthority) {
        throw new \RuntimeException('The ordinary application binding must remain deny-all.');
    }
    if ($action === 'setup') {
        $stage = 'migrations';
        if ($kernel->call('migrate', ['--force' => true, '--no-interaction' => true]) !== 0) {
            throw new \RuntimeException('Fresh isolated migrations failed.');
        }
        $stage = 'editorial_setup';
        \Illuminate\Support\Facades\DB::table('educational_organizations')->insert([
            'synthetic_key' => 'imagine-editorial', 'created_at' => now(), 'updated_at' => now(),
        ]);
        echo "PASS framework-browser setup: actual migrations and editorial organization only; no customer/catalog fixtures.\n";
    } else {
        $stage = 'persistence_verify';
        $counts = [];
        foreach (['sessions', 'educational_organizations', 'educational_courses',
            'educational_course_versions', 'educational_lessons',
            'educational_lesson_progress', 'educational_course_favorites'] as $table) {
            $counts[$table] = \Illuminate\Support\Facades\DB::table($table)->count();
        }
        if ($counts['sessions'] < 3 || $counts['educational_organizations'] < 3
            || $counts['educational_courses'] < 1 || $counts['educational_lesson_progress'] < 1) {
            throw new \RuntimeException('Framework/browser flow did not persist its actual session and learning records.');
        }
        $report = ['schema_version' => 1, 'scope' => 'synthetic_framework_browser_only',
            'database_driver' => 'sqlite', 'session_driver' => 'database',
            'production_authority_default' => 'deny_all', 'counts' => $counts,
            'release_decision' => 'HOLD_NO_GO'];
        $stage = 'persistence_report';
        if (file_put_contents($lab['evidence'].'/framework-persistence.json',
            json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL, LOCK_EX) === false) {
            throw new \RuntimeException('Persistence evidence could not be written.');
        }
        echo "PASS framework-browser persistence: real SQLite sessions/learning records, ordinary provider still deny-all.\n";
    }
} catch (\Throwable $exception) {
    fwrite(STDERR, json_encode(\Tests\Browser\LabGuard::diagnostic($stage, $exception), JSON_THROW_ON_ERROR).PHP_EOL);
    exit(2);
}
