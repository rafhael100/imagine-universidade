<?php
declare(strict_types=1);

// Only the disposable Docker network (CI). Must run BEFORE any Laravel DDL.
function hold(string $message): never {
    fwrite(STDERR, "HOLD synthetic PostgreSQL Laravel preflight: ".$message."\n");
    exit(2);
}
// Fail before Laravel bootstrap, PDO or migrations: a matching database name
// alone is not proof that libpq/Laravel has not been redirected elsewhere.
if (PHP_SAPI !== 'cli') {
    hold('CLI only');
}
foreach ([
    'PGHOST', 'PGHOSTADDR', 'PGPORT', 'PGDATABASE', 'PGUSER',
    'PGPASSWORD', 'PGSERVICE', 'PGSERVICEFILE', 'PGPASSFILE',
    'PGOPTIONS', 'PGSSLMODE', 'PGTARGETSESSIONATTRS',
    'DATABASE_URL', 'DB_URL', 'DB_SOCKET', 'DB_READ_HOST',
    'DB_WRITE_HOST', 'APP_CONFIG_CACHE',
] as $key) {
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        hold('Untrusted PostgreSQL or Laravel connection override');
    }
}
foreach (['.env', '.env.testing', '.env.production', '.env.local',
          'bootstrap/cache/config.php'] as $path) {
    if (is_file('/var/www/html/'.$path)) {
        hold('Local environment or cached Laravel configuration forbidden');
    }
}
if (!is_file('/.dockerenv')) {
    hold('Disposable Docker boundary not attested');
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
if (config('database.default') !== 'pgsql' || !is_array($connection) ||
    ($connection['driver'] ?? null) !== 'pgsql' ||
    !empty($connection['url']) || !empty($connection['read']) ||
    !empty($connection['write']) || !empty($connection['hostaddr']) ||
    !empty($connection['unix_socket'])) {
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
        'SELECT current_database() AS db_name, current_user AS role_name, '.
        'inet_server_port() AS port_number, '.
        "current_setting('server_version_num')::int AS version_num, ".
        'CASE WHEN pg_is_in_recovery() THEN 1 ELSE 0 END AS in_recovery, '.
        'CASE WHEN inet_server_addr() IS NULL THEN 1 ELSE 0 END AS on_unix_socket'
    );
} catch (\Throwable $e) {
    // Never emit SQL error detail, host credentials or connection DSN.
    hold('Authenticated SQL query failed');
}
if (($row->db_name ?? null) !== 'uni_staging_ci_only' ||
    ($row->role_name ?? null) !== 'uni_ci_migration_owner' ||
    (int)($row->port_number ?? 0) !== 5432 ||
    (int)($row->version_num ?? 0) < 180000 ||
    (int)($row->version_num ?? 0) >= 190000 ||
    (int)($row->in_recovery ?? -1) !== 0 ||
    (int)($row->on_unix_socket ?? -1) !== 0) {
    hold('Authenticated local PostgreSQL18 session identity mismatch');
}
echo "PASS synthetic Laravel effective pgsql configuration and authenticated SQL BEFORE migrations.\n";
