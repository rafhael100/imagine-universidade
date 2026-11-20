<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Tutor\TutorGateway;
use App\Domain\Tutor\DisabledTutorGateway;
use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // SEM identidade real do Portal: implementação segura é sempre negar.
        // Troca somente com contrato SSO + segurança aprovado e testes.
        $this->app->bind(PortalAuthority::class, UnavailablePortalAuthority::class);
        $this->app->bind(TutorGateway::class, DisabledTutorGateway::class);
        $this->app->bind(PortalAccessGate::class, function ($app): PortalAccessGate {
            return new PortalAccessGate($app->make(PortalAuthority::class));
        });
    }

    public function boot(): void
    {
        // The framework's default /up only proves PHP boot. The staging
        // session store requires PostgreSQL; health must be negative if the
        // configured database is unavailable. This never authorizes access.
        Event::listen(static function (DiagnosingHealth $event): void {
            try {
                $row = DB::selectOne('SELECT 1 AS health_ready');

                if ((int) ($row->health_ready ?? 0) !== 1) {
                    throw new \\RuntimeException('health_query_failed');
                }
            } catch (\\Throwable) {
                // No DSN, SQLSTATE, connection user or secret in this error.
                throw new \\RuntimeException('health_unavailable');
            }
        });
    }
}
