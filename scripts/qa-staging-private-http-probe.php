<?php

declare(strict_types=1);

// A real HTTP client against disposable PHP-FPM + Nginx, neither published.
$base = 'http://web:8080';
function fetchProbe(string $path): array
{
    global $base;
    $context = stream_context_create([
        'http' => [
            'timeout' => 2,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nX-Company-Id: forged-ci\r\nX-Portal-Grant: true\r\n",
        ],
    ]);
    $text = @file_get_contents($base.$path, false, $context);
    $headers = $http_response_header ?? [];
    return [$text, $headers];
}
$health = null;
for ($attempt = 0; $attempt < 30; $attempt++) {
    $health = fetchProbe('/up');
    if (str_contains($health[1][0] ?? '', ' 200 ')) {
        break;
    }
    usleep(200000);
}
if ($health === null || !str_contains($health[1][0] ?? '', ' 200 ')) {
    // Emit only the numeric HTTP status, never response bodies/headers or
    // container logs: those may contain environment or credential detail.
    $status = 'no-http-response';
    if (preg_match('/^HTTP\\/[^ ]+\\s+([0-9]{3})/', $health[1][0] ?? '', $match) === 1) {
        $status = $match[1];
    }
    fwrite(STDERR, "FAIL: synthetic HTTP health did not reach Laravel FPM (HTTP {$status}).\\n");
    exit(2);
}

$routes = [
    '/universidade/private/app',
    '/universidade/private/courses',
    '/universidade/private/lessons/1',
    '/universidade/private/progress/export',
    '/universidade/private/admin/app',
    '/universidade/private/admin/courses',
    '/universidade/private/admin/audit',
    '/universidade/private/admin/courses/1/publication-check',
];
foreach ($routes as $route) {
    [$body, $headers] = fetchProbe($route);
    if (!str_contains($headers[0] ?? '', ' 403 ')) {
        fwrite(STDERR, "FAIL: private route did not deny access: {$route}\n");
        exit(2);
    }
    if (!is_string($body) || !str_contains($body, 'access_denied')) {
        fwrite(STDERR, "FAIL: denied route response shape invalid: {$route}\n");
        exit(2);
    }
    $rawHeaders = strtolower(implode("\n", $headers));
    if (!str_contains($rawHeaders, 'no-store') ||
        !str_contains($rawHeaders, "default-src 'none'") ||
        !str_contains($rawHeaders, 'x-frame-options: deny')) {
        fwrite(STDERR, "FAIL: denied route insecure headers: {$route}\n");
        exit(2);
    }
}
echo 'PASS: HTTP /up 200, '.count($routes).' guarded routes 403 with secure headers via isolated Nginx/FPM.'."\n";
