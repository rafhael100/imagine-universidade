<?php

declare(strict_types=1);

use App\Http\Middleware\RequireUniversityGrant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'university.grant' => RequireUniversityGrant::class,
        ]);
        // O grupo padrão "web" já aplica sessão e proteção CSRF.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Nunca expor credenciais de sessão ou detalhes da autoridade.
    })
    ->create();
