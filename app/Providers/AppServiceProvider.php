<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\UnavailablePortalAuthority;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // SEM identidade real do Portal: implementação segura é sempre negar.
        // Troca somente com contrato SSO + segurança aprovado e testes.
        $this->app->bind(PortalAuthority::class, UnavailablePortalAuthority::class);
        $this->app->bind(PortalAccessGate::class, function ($app): PortalAccessGate {
            return new PortalAccessGate($app->make(PortalAuthority::class));
        });
    }

    public function boot(): void
    {
    }
}
