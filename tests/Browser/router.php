<?php

declare(strict_types=1);

// Explicit router for the CI-only PHP loopback server. public/index.php stays unchanged.
require_once __DIR__.'/LabGuard.php';
try {
    $lab = \Tests\Browser\LabGuard::environment('http');
    \Tests\Browser\LabGuard::http($lab);
} catch (\Throwable) {
    http_response_code(404);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo '{"error":"not_found"}';
    return true;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
if (in_array($path, ['/assets/logo-imagine.png', '/assets/imagine-tokens.css'], true)
    && in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
    return false;
}

$stage = 'autoloader';
try {
    define('LARAVEL_START', microtime(true));
    require dirname(__DIR__, 2).'/vendor/autoload.php';
    require_once __DIR__.'/LabPortalAuthority.php';
    require_once __DIR__.'/FrameworkBrowserServiceProvider.php';
    $stage = 'application';
    $app = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $app->useStoragePath($lab['directory'].'/storage');
    $request = \Illuminate\Http\Request::capture();
    $app->instance('request', $request);
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $stage = 'framework_bootstrap';
    $kernel->bootstrap();
    $stage = 'configuration';
    \Tests\Browser\LabGuard::configured($app, $lab);
    // Register after normal providers/routing bootstrap. Only the Portal
    // boundary changes; middleware, CSRF, controllers and DB stay real.
    $stage = 'lab_provider';
    $app->register(\Tests\Browser\FrameworkBrowserServiceProvider::class);
    $stage = 'http_request';
    $response = $kernel->handle($request);
    $response->send();
    $stage = 'http_termination';
    $kernel->terminate($request, $response);
} catch (\Throwable $exception) {
    $diagnostic = \Tests\Browser\LabGuard::diagnostic($stage, $exception);
    error_log(json_encode($diagnostic, JSON_THROW_ON_ERROR));
    http_response_code(503);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($diagnostic, JSON_THROW_ON_ERROR);
}
return true;
