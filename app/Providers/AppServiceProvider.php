<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Serviços do C-00 devem operar sem acesso real ao Portal/CRM.
    }

    public function boot(): void
    {
    }
}
