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
