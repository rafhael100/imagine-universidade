<?php

declare(strict_types=1);

namespace Tests\Browser;

use Illuminate\Foundation\Application;
use RuntimeException;

/** Test-only guard. This directory is never copied into the staging image. */
final class LabGuard
{
    public const ENVIRONMENT = 'synthetic-framework-browser';

    /** @return array{directory:string,database:string,control:string,base:string,token:string,instance:string,evidence:string} */
    public static function environment(string $mode): array
    {
        if (getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true'
            || getenv('GITHUB_REPOSITORY') !== 'rafhael100/imagine-universidade'
            || getenv('UNI_FRAMEWORK_BROWSER_LAB') !== 'synthetic'
            || getenv('APP_ENV') !== self::ENVIRONMENT
            || !in_array($mode, ['cli', 'http'], true)
            || PHP_SAPI !== ($mode === 'http' ? 'cli-server' : 'cli')) {
            throw new RuntimeException('Disposable framework-browser context required.');
        }
        $event = getenv('GITHUB_EVENT_NAME');
        if (!(($event === 'push'
                && getenv('GITHUB_REF') === 'refs/heads/fix/uni-c108-private-flow-2026-11-17')
            || $event === 'pull_request')) {
            throw new RuntimeException('Unsupported framework-browser CI event.');
        }
        $root = dirname(__DIR__, 2);
        foreach (['.env', '.env.production', '.env.'.self::ENVIRONMENT, 'ops/staging/.env.staging'] as $name) {
            if (file_exists($root.'/'.$name) || is_link($root.'/'.$name)) {
                throw new RuntimeException('Operational environment files prohibited.');
            }
        }
        $runner = realpath((string) getenv('RUNNER_TEMP'));
        $directoryInput = (string) getenv('UNI_FRAMEWORK_BROWSER_DIR');
        $directory = realpath($directoryInput);
        $evidenceInput = (string) getenv('UNI_FRAMEWORK_BROWSER_EVIDENCE');
        $evidence = realpath($evidenceInput);
        if (!is_string($runner) || !is_string($directory) || !is_string($evidence)
            || $directory !== $directoryInput || is_link($directoryInput)
            || dirname($directory) !== $runner
            || preg_match('/\Auni-framework-browser\.[A-Za-z0-9]{6,16}\z/D', basename($directory)) !== 1
            || (fileperms($directory) & 0077) !== 0
            || $evidence !== $evidenceInput || is_link($evidenceInput)
            || dirname($evidence) !== $runner || $evidence === $directory
            || basename($evidence) !== 'uni-framework-browser-evidence') {
            throw new RuntimeException('Exclusive temporary paths required.');
        }
        $database = $directory.'/database.sqlite';
        $control = $directory.'/authority.json';
        if (getenv('DB_DATABASE') !== $database
            || getenv('UNI_FRAMEWORK_BROWSER_CONTROL') !== $control
            || !is_file($database) || is_link($database)
            || !is_file($control) || is_link($control)
            || (fileperms($database) & 0077) !== 0
            || (fileperms($control) & 0077) !== 0) {
            throw new RuntimeException('Private SQLite and authority-control files required.');
        }
        foreach ([
            'APP_DEBUG' => 'false', 'DB_CONNECTION' => 'sqlite', 'DB_FOREIGN_KEYS' => 'true',
            'SESSION_DRIVER' => 'database', 'SESSION_TABLE' => 'sessions',
            'SESSION_ENCRYPT' => 'true', 'SESSION_SECURE_COOKIE' => 'false',
            'SESSION_HTTP_ONLY' => 'true', 'SESSION_SAME_SITE' => 'lax',
            'SESSION_COOKIE' => 'uni_framework_browser_session',
            'CACHE_STORE' => 'array', 'QUEUE_CONNECTION' => 'sync', 'LOG_CHANNEL' => 'stderr',
            'VIEW_COMPILED_PATH' => $directory.'/storage/framework/views',
            'APP_CONFIG_CACHE' => $directory.'/cache/config.php',
            'APP_SERVICES_CACHE' => $directory.'/cache/services.php',
            'APP_PACKAGES_CACHE' => $directory.'/cache/packages.php',
            'APP_ROUTES_CACHE' => $directory.'/cache/routes.php',
            'APP_EVENTS_CACHE' => $directory.'/cache/events.php',
        ] as $name => $expected) {
            if (getenv($name) !== $expected) {
                throw new RuntimeException('Framework-browser configuration mismatch.');
            }
        }
        foreach (['DB_URL', 'DATABASE_URL', 'SESSION_CONNECTION', 'SESSION_STORE', 'SESSION_DOMAIN'] as $name) {
            if (!in_array(getenv($name), [false, ''], true)) {
                throw new RuntimeException('External connection override prohibited.');
            }
        }
        $token = (string) getenv('UNI_FRAMEWORK_BROWSER_TOKEN');
        $base = (string) getenv('UNI_FRAMEWORK_BROWSER_BASE_URL');
        if (preg_match('/\A[a-f0-9]{64}\z/D', $token) !== 1
            || preg_match('/\Ahttp:\/\/127\.0\.0\.1:([1-9][0-9]{3,4})\z/D', $base, $match) !== 1
            || (int) $match[1] > 65535 || (int) $match[1] < 1024
            || getenv('APP_URL') !== $base
            || preg_match('/\Abase64:[A-Za-z0-9+\/]{43}=\z/D', (string) getenv('APP_KEY')) !== 1) {
            throw new RuntimeException('Loopback origin and disposable keys required.');
        }
        return ['directory' => $directory, 'database' => $database, 'control' => $control,
            'base' => $base, 'token' => $token, 'instance' => hash('sha256', $token), 'evidence' => $evidence];
    }

    /** @param array<string,string> $lab */
    public static function http(array $lab): void
    {
        if (($_SERVER['REMOTE_ADDR'] ?? '') !== '127.0.0.1'
            || ($_SERVER['HTTP_HOST'] ?? '') !== substr($lab['base'], strlen('http://'))) {
            throw new RuntimeException('Loopback HTTP client required.');
        }
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        if (is_string($path) && str_starts_with($path, '/__uni_ci/')) {
            self::fixtureToken((string) ($_SERVER['HTTP_X_UNI_FRAMEWORK_LAB'] ?? ''), $lab['token']);
        }
    }

    public static function fixtureToken(string $candidate, string $expected): void
    {
        if (!hash_equals($expected, $candidate)) {
            throw new RuntimeException('Framework-browser fixture token required.');
        }
    }

    /** @param array<string,string> $lab */
    public static function configured(Application $app, array $lab): void
    {
        $config = $app->make('config');
        if (!$app->environment(self::ENVIRONMENT) || $app->runningUnitTests()
            || $app->shouldSkipMiddleware()
            || $app->storagePath() !== $lab['directory'].'/storage'
            || $config->get('database.default') !== 'sqlite'
            || $config->get('database.connections.sqlite.database') !== $lab['database']
            || !empty($config->get('database.connections.sqlite.url'))
            || $config->get('session.driver') !== 'database'
            || $config->get('session.table') !== 'sessions'
            || !empty($config->get('session.connection'))
            || $config->get('session.encrypt') !== true
            || $config->get('session.http_only') !== true
            || $config->get('session.secure') !== false) {
            throw new RuntimeException('Real isolated framework/session configuration required.');
        }
    }

    /** @return array<string,array{company:string,subject:string,permission:string}> */
    public static function profiles(): array
    {
        return [
            'editor' => ['company' => 'imagine-editorial', 'subject' => 'ci-framework-editor', 'permission' => 'university:manage'],
            'student-a' => ['company' => 'ci-framework-company-a', 'subject' => 'ci-framework-student', 'permission' => 'university:view'],
            'student-b' => ['company' => 'ci-framework-company-b', 'subject' => 'ci-framework-student', 'permission' => 'university:view'],
        ];
    }

    public static function credential(string $profile, string $token): string
    {
        if (!array_key_exists($profile, self::profiles())) {
            throw new RuntimeException('Unknown fixed laboratory profile.');
        }
        return hash_hmac('sha256', 'uni-framework-browser:'.$profile, $token);
    }

    /** @return array{error:string,stage:string,type:string} */
    public static function diagnostic(string $stage, \Throwable $exception): array
    {
        $stages = ['guard', 'input', 'autoloader', 'application', 'framework_bootstrap',
            'configuration', 'lab_provider', 'http_request', 'http_termination',
            'migrations', 'editorial_setup', 'persistence_verify', 'persistence_report'];
        $type = get_class($exception);
        if (strlen($type) > 150
            || preg_match('/\A[A-Za-z_][A-Za-z0-9_]*(?:\\\\[A-Za-z_][A-Za-z0-9_]*)*\z/D', $type) !== 1) {
            $type = 'Throwable';
        }
        return ['error' => 'lab_bootstrap_failed',
            'stage' => in_array($stage, $stages, true) ? $stage : 'unknown_stage', 'type' => $type];
    }
}
