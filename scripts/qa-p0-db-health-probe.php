<?php

declare(strict_types=1);

// Disposable internal-only PG18 outage. /up must fail without SQL/stack leaks.
$context = stream_context_create([
    'http' => ['timeout' => 5, 'ignore_errors' => true, 'header' => "Accept: text/plain\r\n"],
]);
$body = @file_get_contents('http://web:8080/up', false, $context);
$headers = $http_response_header ?? [];
$status = $headers[0] ?? '';
if (!is_string($body) || !preg_match('~^HTTP/\\d(?:\\.\\d)? (?:500|503) ~', $status)) {
    fwrite(STDERR, "HOLD: Laravel /up did not fail closed during PostgreSQL outage.\n");
    exit(2);
}
if (strlen($body) > 16384 ||
    preg_match('~SQLSTATE|PDOException|QueryException|FAKE_OWNER|FAKE_RUNTIME|DB_PASSWORD|PGPASSWORD|vendor/laravel|stack trace|traceback~i', $body)) {
    fwrite(STDERR, "HOLD: Laravel readiness outage response may expose infrastructure details.\n");
    exit(2);
}
echo "PASS synthetic /up non-2xx without SQL/stack disclosure while PostgreSQL is down.\n";
