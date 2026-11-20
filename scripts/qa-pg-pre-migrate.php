<?php
declare(strict_types=1);

/**
 * P0: non-mutating preflight before *any* synthetic migration.
 * Fixed PostgreSQL 18 connection inside an isolated Docker/Actions laboratory.
 * This does not certify Portal identity, staging or production readiness.
 */
function holdPgQa(string $reason): never
{
    fwrite(STDERR, "HOLD QA PostgreSQL pre-migrate: {$reason}\n");
    exit(2);
}

$root = dirname(__DIR__);
if (PHP_SAPI !== 'cli') {
    holdPgQa('CLI required');
}
if (!is_file('/.dockerenv') &&
    !(getenv('CI') === 'true' && getenv('GITHUB_ACTIONS') === 'true'
      && getenv('GITHUB_REPOSITORY') === 'rafhael100/imagine-universidade')) {
    holdPgQa('isolated Docker or repository Actions runner required');
}
foreach ([
    'APP_ENV' => 'testing', 'APP_DEBUG' => 'false',
    'DB_CONNECTION' => 'pgsql', 'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432', 'DB_DATABASE' => 'uni_ci',
    'DB_USERNAME' => 'uni_ci', 'DB_PASSWORD' => 'synthetic_ci_only',
] as $key => $expected) {
    if (getenv($key) !== $expected) {
        holdPgQa('disposable database environment differs from allowlist');
    }
}
foreach ([
    'PGHOST', 'PGHOSTADDR', 'PGPORT', 'PGDATABASE', 'PGUSER',
    'PGSERVICE', 'PGSERVICEFILE', 'PGPASSFILE', 'PGOPTIONS',
    'PGSSLMODE', 'DATABASE_URL', 'DB_URL', 'DB_SOCKET',
    'APP_CONFIG_CACHE', 'DB_READ_HOST', 'DB_WRITE_HOST',
] as $override) {
    $value = getenv($override);
    if ($value !== false && $value !== '') {
        holdPgQa('external connection or configuration override is forbidden');
    }
}
foreach (['.env', '.env.testing', '.env.production', '.env.local',
          'bootstrap/cache/config.php'] as $path) {
    if (file_exists($root.'/'.$path)) {
        holdPgQa('environment file or cached Laravel configuration is forbidden');
    }
}
if (!extension_loaded('pdo_pgsql') || !is_file($root.'/vendor/autoload.php')) {
    holdPgQa('locked dependencies and pdo_pgsql must be available before SQL preflight');
}

try {
    require $root.'/vendor/autoload.php';
    $app = require $root.'/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $config = $app->make('config');
    $db = $config->get('database.connections.pgsql');
    if ($config->get('database.default') !== 'pgsql' || !is_array($db)) {
        holdPgQa('effective Laravel database default is not pgsql');
    }
    foreach ([
        'driver' => 'pgsql', 'host' => '127.0.0.1',
        'database' => 'uni_ci', 'username' => 'uni_ci',
        'password' => 'synthetic_ci_only',
    ] as $key => $value) {
        if (($db[$key] ?? null) !== $value) {
            holdPgQa('effective Laravel database configuration differs from allowlist');
        }
    }
    if ((string)($db['port'] ?? '') !== '5432'
        || !empty($db['url']) || isset($db['read']) || isset($db['write'])) {
        holdPgQa('effective database port, URL or read/write targets are unsafe');
    }

    $pdo = $app->make('db')->connection('pgsql')->getPdo();
    if (!$pdo instanceof \PDO || $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) !== 'pgsql') {
        holdPgQa('Laravel did not connect through PDO PostgreSQL');
    }
    $row = $pdo->query(
        "SELECT current_database() AS db_name, current_user AS db_role, ".
        "inet_server_addr()::text AS server_address, inet_server_port() AS server_port, ".
        "current_setting('server_version_num')::int AS version_num, ".
        "CASE WHEN pg_is_in_recovery() THEN 1 ELSE 0 END AS in_recovery"
    )->fetch(\PDO::FETCH_ASSOC);
    if (!is_array($row) || $row['db_name'] !== 'uni_ci' ||
        $row['db_role'] !== 'uni_ci') {
        holdPgQa('SQL database name or connected role differs from synthetic allowlist');
    }
    if ((int)$row['server_port'] !== 5432) {
        holdPgQa('SQL server port is not the local synthetic port');
    }
    if ((int)$row['version_num'] < 180000 || (int)$row['version_num'] >= 190000) {
        holdPgQa('SQL server version is not PostgreSQL 18');
    }
    if ((int)$row['in_recovery'] !== 0) {
        holdPgQa('SQL connected to read-only recovery server');
    }
    if (!is_string($row['server_address']) ||
        filter_var($row['server_address'], FILTER_VALIDATE_IP) === false ||
        filter_var($row['server_address'],
            FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
        holdPgQa('SQL server endpoint is not an approved local/private test address');
    }
} catch (\Throwable $exception) {
    // Never print SQL exceptions: DSNs, credentials and internal addresses may leak.
    holdPgQa('Laravel bootstrap or authenticated SQL query failed');
}
echo "PASS QA PostgreSQL pre-migrate: effective Laravel config + live synthetic PG18 SQL checked; no migration executed.\n";
