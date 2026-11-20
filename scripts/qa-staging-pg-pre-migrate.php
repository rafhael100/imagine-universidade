<?php
declare(strict_types=1);

// Only the disposable Docker network (CI). Must run BEFORE any Laravel DDL.
function hold(string $message): never {
    fwrite(STDERR, "HOLD synthetic PostgreSQL Laravel preflight: ".$message."\n");
    exit(2);
}
if (getenv('APP_ENV') !== 'testing' ||
    getenv('APP_DEBUG') !== 'false' ||
    getenv('DB_CONNECTION') !== 'pgsql' ||
    getenv('DB_HOST') !== 'db' ||
    getenv('DB_PORT') !== '5432' ||
    getenv('DB_DATABASE') !== 'uni_staging_ci_only' ||
    getenv('DB_USERNAME') !== 'uni_ci_migration_owner' ||
    getenv('DB_PASSWORD') !== 'FAKE_OWNER_CI_ONLY') {
    hold('Unexpected synthetic configuration');
}
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$connection = config('database.connections.pgsql');
if (config('database.default') !== 'pgsql' || !is_array($connection)) {
    hold('Effective Laravel driver differs from expected pgsql');
}
foreach ([
    'host' => 'db', 'port' => '5432', 'database' => 'uni_staging_ci_only',
    'username' => 'uni_ci_migration_owner', 'password' => 'FAKE_OWNER_CI_ONLY',
] as $key => $value) {
    if ((string)($connection[$key] ?? '') !== $value) {
        hold('Effective Laravel PostgreSQL configuration mismatch');
    }
}
try {
    $row = \Illuminate\Support\Facades\DB::connection('pgsql')->selectOne(
        'SELECT current_database() AS db_name, current_user AS role_name, inet_server_port() AS port_number'
    );
} catch (\Throwable $e) {
    // Never emit SQL error detail, host credentials or connection DSN.
    hold('Authenticated SQL query failed');
}
if (($row->db_name ?? null) !== 'uni_staging_ci_only' ||
    ($row->role_name ?? null) !== 'uni_ci_migration_owner' ||
    (int)($row->port_number ?? 0) !== 5432) {
    hold('Authenticated PostgreSQL session identity mismatch');
}
echo "PASS synthetic Laravel effective pgsql configuration and authenticated SQL BEFORE migrations.\n";
