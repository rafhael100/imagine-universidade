<?php

declare(strict_types=1);

namespace Tests\Browser;

use App\Domain\Access\PortalAuthority;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Registered solely by the guarded laboratory router, never app providers. */
final class FrameworkBrowserServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        LabGuard::environment('http');
        $this->app->bind(PortalAuthority::class, LabPortalAuthority::class);
    }

    public function boot(): void
    {
        $lab = LabGuard::environment('http');
        Route::middleware('web')->prefix('__uni_ci')->group(static function () use ($lab): void {
            Route::get('/health', static function (Request $request) use ($lab) {
                LabGuard::fixtureToken((string) $request->header('X-Uni-Framework-Lab'), $lab['token']);
                return response()->json(['lab' => 'uni-framework-browser', 'instance' => $lab['instance'],
                    'environment' => LabGuard::ENVIRONMENT], 200, ['Cache-Control' => 'private, no-store']);
            });
            Route::get('/session', static function (Request $request) use ($lab) {
                LabGuard::fixtureToken((string) $request->header('X-Uni-Framework-Lab'), $lab['token']);
                return response()->json(['csrf_token' => $request->session()->token()], 200,
                    ['Cache-Control' => 'private, no-store']);
            });
            foreach (LabGuard::profiles() as $name => $profile) {
                Route::post('/session/'.$name, static function (Request $request) use ($lab, $name, $profile) {
                    LabGuard::fixtureToken((string) $request->header('X-Uni-Framework-Lab'), $lab['token']);
                    // The regular web middleware checks CSRF before this action.
                    // Arbitrary company/person input is never accepted here.
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    $request->session()->put([
                        'portal_server_credential' => LabGuard::credential($name, $lab['token']),
                        'portal_company_id' => $profile['company'],
                    ]);
                    return response()->json(['ready' => true, 'profile' => $name,
                        'csrf_token' => $request->session()->token()], 200, ['Cache-Control' => 'private, no-store']);
                });
            }
        });
    }
}
