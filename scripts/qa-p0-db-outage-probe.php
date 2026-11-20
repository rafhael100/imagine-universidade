<?php

declare(strict_types=1);

// Only invoked by synthetic Docker QA while the disposable PG18 service is down.
// No real session/Portal authority and no browser-facing test host port.
$base = 'http://web:8080';
$paths = [
    '/universidade/private/app',
    '/universidade/private/courses',
    '/universidade/private/lessons/1',
    '/universidade/private/progress/export',
    '/universidade/private/admin/app',
    '/universidade/private/admin/courses',
    '/universidade/private/admin/audit',
];
foreach ($paths as $path) {
    $context = stream_context_create([
        'http' => [
            'timeout' => 4,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nX-Company-Id: forged-ci\r\nX-Portal-Grant: true\r\n",
        ],
    ]);
    $body = @file_get_contents($base.$path, false, $context);
    $headers = $http_response_header ?? [];
    if ($body === false || !is_string($body)) {
        fwrite(STDERR, "HOLD: missing bounded private HTTP response during PG outage: {$path}\n");
        exit(2);
    }
    $status = $headers[0] ?? '';
    // A dependency failure must NEVER release a private page, cached body or
    // a successful response. Treat unhandled 500 as a regression (not a pass).
    if (!preg_match('/ HTTP\\/\\d(?:\\.\\d)? (?:403|503) /', ' '.$status.' ')) {
        fwrite(STDERR, "HOLD: unhandled/out-of-policy private HTTP status during PG outage: {$path}\n");
        exit(2);
    }
    $rawHeaders = strtolower(implode("\n", $headers));
    if (!str_contains($rawHeaders, 'no-store')
        || !str_contains($rawHeaders, "default-src 'none'")
        || !str_contains($rawHeaders, 'x-frame-options: deny')) {
        fwrite(STDERR, "HOLD: private outage response missing anti-cache/CSP/frame headers: {$path}\n");
        exit(2);
    }
    if (strlen($body) > 2048
        || preg_match('/sqlstate|stack trace|traceback|exception|database\\/connections|db_password|pgpassword|FAKE_OWNER|FAKE_RUNTIME|vendor\\/laravel/i', $body)) {
        fwrite(STDERR, "HOLD: private outage response may disclose infrastructure details: {$path}\n");
        exit(2);
    }
}
echo 'PASS synthetic PG outage: '.count($paths).' private client/admin routes fail closed, safely and without data disclosure.'.PHP_EOL;
