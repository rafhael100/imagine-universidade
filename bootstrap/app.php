<?php

declare(strict_types=1);

use App\Http\Middleware\ProtectPrivateUniversityResponses;
use App\Http\Middleware\RequireUniversityGrant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Outside the web/CSRF stack, so early errors and unknown private
        // routes receive the same no-store and security response policy.
        $middleware->prepend(ProtectPrivateUniversityResponses::class);
        $middleware->alias([
            'university.grant' => RequireUniversityGrant::class,
        ]);
        // O grupo padrão "web" já aplica sessão e proteção CSRF.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Private validation errors must not redirect or flash study terms,
        // tutor questions or editorial drafts into the session. Preserve the
        // framework's normal content negotiation everywhere else.
        $exceptions->shouldRenderJsonWhen(
            static fn (Request $request, \Throwable $exception): bool =>
                ProtectPrivateUniversityResponses::matches($request) || $request->expectsJson()
        );

        // A database-backed Laravel session can fail before the university
        // grant middleware executes. Fail CLOSED without exposing SQL or a
        // stack trace. Do not change handling for paths outside this private
        // boundary; a 503 is not a login, grant or successful response.
        $exceptions->render(
            static function (\\Illuminate\\Database\\QueryException|\\PDOException $error, Request $request): ?Response {
                if (!ProtectPrivateUniversityResponses::matches($request)) {
                    return null;
                }

                return ProtectPrivateUniversityResponses::apply(
                    response()->json(['error' => 'service_unavailable'], 503)
                        ->header('Retry-After', '5')
                );
            }
        );

        // Also cover exceptions rendered by the HTTP kernel outside any
        // middleware slice, without changing status codes or Retry-After.
        $exceptions->respond(
            static fn (Response $response, \Throwable $exception, Request $request): Response =>
                ProtectPrivateUniversityResponses::matches($request)
                    ? ProtectPrivateUniversityResponses::apply($response)
                    : $response
        );
    })
    ->create();
