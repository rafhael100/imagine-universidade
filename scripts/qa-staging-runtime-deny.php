<?php

declare(strict_types=1);

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$kernel = $app->make(Kernel::class);

$routes = [
    '/universidade/private/app',
    '/universidade/private/courses',
    '/universidade/private/progress/export',
    '/universidade/private/lessons/1',
    '/universidade/private/lessons/1/progress',
    '/universidade/private/admin/app',
    '/universidade/private/admin/courses',
    '/universidade/private/admin/audit',
    '/universidade/private/admin/courses/1/publication-check',
];

foreach ($routes as $route) {
    $request = Request::create($route, 'GET', server: [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_X_COMPANY_ID' => 'forged-ci-company',
        'HTTP_X_PORTAL_GRANT' => 'true',
    ]);
    $response = $kernel->handle($request);
    if ($response->getStatusCode() !== 403
        || !str_contains((string) $response->headers->get('Cache-Control'), 'no-store')
        || !str_contains((string) $response->headers->get('Content-Security-Policy'), "default-src 'none'")) {
        fwrite(STDERR, 'FAIL: unauthorized route leaked or insecure headers: '.$route.PHP_EOL);
        exit(2);
    }
    $kernel->terminate($request, $response);
}
echo 'PASS: '.count($routes).' private Laravel routes deny forged client identity in real staging image.'.PHP_EOL;
