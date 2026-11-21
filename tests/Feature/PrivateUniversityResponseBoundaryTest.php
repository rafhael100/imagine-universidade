<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * HTTP regressions against Laravel's actual CSRF, validation, throttling and
 * exception pipeline. Identities and database failures are synthetic only.
 */
final class PrivateUniversityResponseBoundaryTest extends TestCase
{
    private const CSRF_TOKEN = 'synthetic-c108-csrf-token-not-a-credential';

    private function enableRealCsrfChecks(): void
    {
        // Laravel skips forgery checks when runningUnitTests() is true.
        // Change only this test application's environment marker so the
        // actual framework middleware checks the token. No middleware mock.
        $this->app->instance('env', 'synthetic-http-boundary');
    }

    private function asSyntheticReader(): void
    {
        $this->app->instance(PortalAuthority::class, new class implements PortalAuthority {
            public function verify(
                string $serverSessionCredential,
                string $companyId,
                string $permission,
            ): PortalGrant {
                if ($serverSessionCredential !== 'c108-synthetic-session'
                    || $companyId !== 'c108-synthetic-company'
                    || $permission !== PortalAccessGate::VIEW) {
                    return PortalGrant::deny('synthetic_context_mismatch');
                }

                return PortalGrant::allow(
                    $companyId, 'c108-synthetic-student', $permission, 1, time() + 30,
                );
            }
        });
        $this->withSession([
            '_token' => self::CSRF_TOKEN,
            'portal_server_credential' => 'c108-synthetic-session',
            'portal_company_id' => 'c108-synthetic-company',
        ]);
        $this->withHeader('X-CSRF-TOKEN', self::CSRF_TOKEN);
    }

    private function assertPrivateErrorHeaders(TestResponse $response): void
    {
        $response->assertHeader('Pragma', 'no-cache')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->assertHeader('Referrer-Policy', 'same-origin');

        $headers = $response->baseResponse->headers;
        self::assertStringContainsString('no-store', (string) $headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $headers->get('Cache-Control'));
        self::assertSame(
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            $headers->get('Content-Security-Policy'),
        );
    }

    public function test_real_csrf_failures_are_private_json_without_redirect_or_flash(): void
    {
        $this->enableRealCsrfChecks();

        // No token, no verified session and no Accept: application/json.
        $missing = $this->post('/universidade/private/search', [
            'query' => 'synthetic-sensitive-study-term',
        ], ['Accept' => 'text/html']);
        $missing->assertStatus(419)->assertHeader('Content-Type', 'application/json');
        self::assertFalse($missing->baseResponse->headers->has('Location'));
        $missing->assertSessionMissing('_old_input');
        $this->assertPrivateErrorHeaders($missing);

        $this->withSession(['_token' => self::CSRF_TOKEN]);
        $mismatch = $this->withHeader('X-CSRF-TOKEN', 'wrong-synthetic-token')
            ->postJson('/universidade/private/initialize');
        $mismatch->assertStatus(419)->assertDontSee('wrong-synthetic-token');
        $this->assertPrivateErrorHeaders($mismatch);
    }

    public function test_valid_csrf_does_not_create_or_replace_a_portal_grant(): void
    {
        $this->enableRealCsrfChecks();
        $this->withSession(['_token' => self::CSRF_TOKEN]);
        $response = $this->withHeader('X-CSRF-TOKEN', self::CSRF_TOKEN)
            ->postJson('/universidade/private/search', ['query' => 'visitas']);

        $response->assertForbidden()->assertJsonPath('error', 'access_denied');
        $this->assertPrivateErrorHeaders($response);
    }

    public function test_private_validation_never_redirects_or_flashes_input_without_json_accept(): void
    {
        $this->enableRealCsrfChecks();
        $this->asSyntheticReader();
        $privateTerm = 'synthetic-study-term-'.str_repeat('a', 70);

        $response = $this->post('/universidade/private/search', [
            'query' => $privateTerm,
            'question' => 'synthetic-private-tutor-question',
            'body' => 'synthetic-private-editorial-draft',
        ], ['Accept' => 'text/html']);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('query')
            ->assertHeader('Content-Type', 'application/json')
            ->assertSessionMissing('_old_input')
            ->assertSessionMissing('errors')
            ->assertDontSee($privateTerm)
            ->assertDontSee('synthetic-private-tutor-question')
            ->assertDontSee('synthetic-private-editorial-draft');
        self::assertFalse($response->baseResponse->headers->has('Location'));
        $this->assertPrivateErrorHeaders($response);
    }

    public function test_actual_search_throttle_preserves_429_retry_after_and_private_headers(): void
    {
        $this->enableRealCsrfChecks();
        $this->asSyntheticReader();

        // Invalid terms stop before the database, but still consume the
        // route's real 20/minute limiter. The 21st request must be throttled.
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->postJson('/universidade/private/search', ['query' => '%'])
                ->assertUnprocessable();
        }
        $response = $this->postJson('/universidade/private/search', ['query' => '%']);

        $response->assertStatus(429)->assertHeader('Retry-After');
        self::assertGreaterThan(0, (int) $response->baseResponse->headers->get('Retry-After'));
        $this->assertPrivateErrorHeaders($response);
    }

    public function test_real_database_exception_remains_generic_and_private(): void
    {
        $this->asSyntheticReader();
        config()->set('app.debug', false);
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');

        // A deliberately unmigrated disposable DB fails inside the real
        // catalog query. No artificial route or exception renderer is used.
        $response = $this->getJson('/universidade/private/courses');
        $response->assertStatus(503)->assertJsonPath('error', 'service_unavailable')
            ->assertHeader('Retry-After', '5')
            ->assertDontSee('educational_organizations')
            ->assertDontSee('SQLSTATE')
            ->assertDontSee('c108-synthetic-session')
            ->assertDontSee('c108-synthetic-student');
        self::assertArrayNotHasKey('trace', $response->json());
        self::assertArrayNotHasKey('file', $response->json());
        $this->assertPrivateErrorHeaders($response);
    }

    public function test_unknown_private_routes_keep_404_and_private_headers(): void
    {
        foreach (['/universidade/private', '/universidade/private/nonexistent'] as $path) {
            $response = $this->get($path);
            $response->assertNotFound()->assertJsonPath('error', 'not_found');
            $this->assertPrivateErrorHeaders($response);
        }

        $head = $this->call('HEAD', '/universidade/private/nonexistent');
        $head->assertNotFound();
        $this->assertPrivateErrorHeaders($head);
    }

    public function test_health_and_neighboring_url_prefix_do_not_receive_private_policy(): void
    {
        $health = $this->get('/up')->assertOk();
        self::assertFalse($health->baseResponse->headers->has('Content-Security-Policy'));
        self::assertFalse($health->baseResponse->headers->has('X-Robots-Tag'));

        $neighbor = $this->get('/universidade/private-other/nonexistent')->assertNotFound();
        self::assertFalse($neighbor->baseResponse->headers->has('Content-Security-Policy'));
        self::assertFalse($neighbor->baseResponse->headers->has('X-Robots-Tag'));
    }
}
