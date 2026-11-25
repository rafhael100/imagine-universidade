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
// Two-container QA intentionally has NO database; the app health listener
// probes SQL and MUST NOT report 200. The three-container QA includes PG18
// and MUST report 200. The mode is a synthetic runner flag, never an auth hint.
$withoutSql = getenv('UNI_QA_EXPECT_DB_HEALTH_DOWN') === '1';
$healthStatus = 0;
for ($attempt = 0; $attempt < 30; $attempt++) {
    [, $headers] = fetchProbe('/up');
    $statusLine = $headers[0] ?? '';
    $healthStatus = preg_match('~^HTTP/\S+\s+([0-9]{3})~', $statusLine, $match) === 1
        ? (int) $match[1] : 0;
    if ($withoutSql
        ? in_array($healthStatus, [500, 503], true)
        : $healthStatus === 200) {
        break;
    }
    usleep(200000);
}
if ($withoutSql
    ? !in_array($healthStatus, [500, 503], true)
    : $healthStatus !== 200) {
    // Only numeric HTTP status in synthetic CI. Never emit body, error page,
    // headers, DSN, credentials or potentially sensitive container logs.
    fwrite(STDERR, "FAIL: unexpected synthetic /up health status: {$healthStatus}\n");
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
echo 'PASS: HTTP /up '.($withoutSql ? '500/503 (database intentionally absent)' : '200 (database available)').', '.count($routes).' guarded routes 403 with secure headers via isolated Nginx/FPM.'."\n";
