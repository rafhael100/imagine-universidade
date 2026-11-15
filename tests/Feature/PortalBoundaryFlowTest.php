<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/**
 * E2E at the Laravel HTTP boundary, with SYNTHETIC Portal decisions only.
 *
 * This does not create login, SSO callbacks, or trust HTTP headers/body.
 * The production PortalAuthority remains UnavailablePortalAuthority (deny-all).
 */
final class PortalBoundaryFlowTest extends TestCase
{
    private PortalAuthority $fakeAuthority;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');

        $this->artisan('migrate:fresh')->assertExitCode(0);

        $now = now();
        foreach (['imagine-editorial', 'test-client-a', 'test-client-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Test-only mutable authority: every access is reverified by middleware.
        $this->fakeAuthority = new class implements PortalAuthority {
            public bool $online = true;
            public bool $clientAEligible = true;
            public bool $clientBEligible = true;
            public bool $editorEnabled = true;
            public int $verificationCount = 0;

            public function verify(
                string $serverSessionCredential,
                string $companyId,
                string $permission,
            ): PortalGrant {
                $this->verificationCount++;

                if (!$this->online) {
                    throw new RuntimeException('Synthetic Portal outage');
                }

                $sessions = [
                    'synthetic-editor-session' => [
                        'imagine-editorial', 'synthetic-editor', PortalAccessGate::MANAGE,
                    ],
                    'synthetic-client-a-session' => [
                        'test-client-a', 'synthetic-person-a', PortalAccessGate::VIEW,
                    ],
                    'synthetic-client-b-session' => [
                        'test-client-b', 'synthetic-person-b', PortalAccessGate::VIEW,
                    ],
                ];
                $identity = $sessions[$serverSessionCredential] ?? null;

                if ($identity === null || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('invalid_link_or_permission');
                }

                if ($companyId === 'test-client-a' && !$this->clientAEligible) {
                    return PortalGrant::deny('last_service_cancelled');
                }
                if ($companyId === 'test-client-b' && !$this->clientBEligible) {
                    return PortalGrant::deny('last_service_cancelled');
                }
                if ($companyId === 'imagine-editorial' && !$this->editorEnabled) {
                    return PortalGrant::deny('editor_revoked');
                }

                return PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };

        $this->app->instance(PortalAuthority::class, $this->fakeAuthority);
    }

    private function asEditor(): void
    {
        $this->withSession([
            'portal_server_credential' => 'synthetic-editor-session',
            'portal_company_id' => 'imagine-editorial',
        ]);
    }

    private function asClientA(): void
    {
        $this->withSession([
            'portal_server_credential' => 'synthetic-client-a-session',
            'portal_company_id' => 'test-client-a',
        ]);
    }

    private function asClientB(): void
    {
        $this->withSession([
            'portal_server_credential' => 'synthetic-client-b-session',
            'portal_company_id' => 'test-client-b',
        ]);
    }

    /** @return array{0: int, 1: int} */
    private function createPublishedCourse(): array
    {
        $this->asEditor();
        $courseId = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'teste-revogacao-tenant',
            'title' => 'Metodologia Imagine',
            'category' => 'metodologia',
            'summary' => 'Fluxo Visitas, Leads, Clientes',
        ])->assertCreated()->json('id');

        $lessonId = (int) $this->postJson(
            "/universidade/private/admin/courses/{$courseId}/lessons",
            [
                'slug' => 'teste-aula-um',
                'title' => 'As três etapas',
                'body' => 'Visitas não são leads e leads não são clientes automaticamente.',
            ],
        )->assertCreated()->json('id');

        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")
            ->assertOk()->assertJsonPath('published', true);

        return [$courseId, $lessonId];
    }

    public function test_headers_and_body_cannot_create_a_server_session(): void
    {
        $headers = [
            'X-Company-Id' => 'test-client-a',
            'X-Portal-Subject' => 'synthetic-person-a',
            'X-Portal-Grant' => 'university:manage',
            'X-Portal-Session' => 'synthetic-editor-session',
        ];

        $this->getJson('/universidade/private/courses?portal_company_id=test-client-a', $headers)
            ->assertForbidden();

        $this->postJson('/universidade/private/initialize', [
            'portal_server_credential' => 'synthetic-client-a-session',
            'portal_company_id' => 'test-client-a',
            'company_id' => 'test-client-a',
        ], $headers)->assertForbidden();

        $this->postJson('/universidade/private/admin/courses', [
            'portal_server_credential' => 'synthetic-editor-session',
            'portal_company_id' => 'imagine-editorial',
            'title' => 'Forged',
            'slug' => 'forged',
            'category' => 'metodologia',
        ], $headers)->assertForbidden();

        self::assertSame(0, $this->fakeAuthority->verificationCount);
        self::assertSame(0, DB::table('educational_courses')->count());
    }

    public function test_student_and_editor_capabilities_are_not_interchangeable(): void
    {
        $this->asClientA();
        $student = $this->get('/universidade/private/app')->assertOk();
        $student->assertSee('Visitas');
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();
        $this->get('/universidade/private/admin/app')->assertForbidden();

        $cacheControl = $student->baseResponse->headers->get('Cache-Control', '');
        self::assertStringContainsString('private', $cacheControl);
        self::assertStringContainsString('no-store', $cacheControl);
        $student->assertHeader('X-Frame-Options', 'DENY');

        $this->asEditor();
        $this->get('/universidade/private/admin/app')->assertOk();
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->get('/universidade/private/app')->assertForbidden();
    }

    public function test_revoking_last_service_blocks_next_read_and_write_without_removing_history(): void
    {
        [, $lessonId] = $this->createPublishedCourse();

        $this->asClientA();
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', false);
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")
            ->assertOk()->assertJsonPath('completed', true);

        $this->fakeAuthority->clientAEligible = false;
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")->assertForbidden();
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")->assertForbidden();
        $this->postJson('/universidade/private/initialize')->assertForbidden();

        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_company_switching_and_header_spoofing_cannot_read_other_tenant_progress(): void
    {
        [, $lessonId] = $this->createPublishedCourse();
        $this->asClientA();
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")->assertOk();

        // Attempt to reuse A's server credential with B as session company.
        $this->withSession([
            'portal_server_credential' => 'synthetic-client-a-session',
            'portal_company_id' => 'test-client-b',
        ]);
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")->assertForbidden();

        // Legitimate B may view the SAME public-to-eligible curriculum, not A's progress.
        $this->asClientB();
        $this->getJson('/universidade/private/courses')
            ->assertOk()->assertJsonCount(1, 'courses');
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress?subject_id=synthetic-person-a", [
            'X-Company-Id' => 'test-client-a',
            'X-Portal-Subject' => 'synthetic-person-a',
        ])->assertOk()->assertJsonPath('completed', false);

        $this->asClientA();
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', true);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_portal_outage_revokes_access_on_next_request_even_with_existing_session(): void
    {
        [, $lessonId] = $this->createPublishedCourse();

        $this->asClientA();
        $this->getJson('/universidade/private/courses')->assertOk();

        $this->fakeAuthority->online = false;
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")->assertForbidden();

        $this->asEditor();
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses', [
            'title' => 'Should not exist',
            'slug' => 'should-not-exist',
            'category' => 'negocios',
        ])->assertForbidden();

        self::assertSame(0, DB::table('educational_lesson_progress')->count());
    }

    public function test_body_claims_cannot_provision_a_different_organization(): void
    {
        $this->asClientA();
        $this->postJson('/universidade/private/initialize', [
            'company_id' => 'forged-customer-company',
            'subject_id' => 'forged-subject',
            'permission' => PortalAccessGate::MANAGE,
        ])->assertOk()->assertJsonPath('ready', true);

        self::assertSame(0, DB::table('educational_organizations')
            ->where('synthetic_key', 'forged-customer-company')->count());

        $this->fakeAuthority->clientAEligible = false;
        $this->postJson('/universidade/private/initialize', [
            'company_id' => 'forged-customer-company',
        ])->assertForbidden();
    }

    public function test_editor_revocation_blocks_future_mutations_and_does_not_erase_approved_content(): void
    {
        [$courseId] = $this->createPublishedCourse();

        $this->fakeAuthority->editorEnabled = false;
        $this->postJson("/universidade/private/admin/courses/{$courseId}/unpublish")->assertForbidden();
        $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'rejected',
            'title' => 'Rejected course',
            'category' => 'negocios',
        ])->assertForbidden();

        self::assertSame(1, DB::table('educational_courses')->where('is_published', true)->count());
        self::assertSame(1, DB::table('educational_courses')->count());
    }
}
