<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class PrivateUniversityRoutesTest extends TestCase
{
    public function test_student_endpoints_reject_anonymous_access(): void
    {
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->get('/universidade/private/app')->assertForbidden();
        $this->postJson('/universidade/private/initialize')->assertForbidden();
        $this->getJson('/universidade/private/courses/1/lessons')->assertForbidden();
        $this->getJson('/universidade/private/lessons/1')->assertForbidden();
        $this->getJson('/universidade/private/lessons/1/progress')->assertForbidden();
        $this->postJson('/universidade/private/lessons/1/complete')->assertForbidden();
    }

    public function test_denied_requests_have_private_security_headers(): void
    {
        $this->getJson('/universidade/private/courses')
            ->assertForbidden()
            ->assertHeader('Cache-Control', 'private, no-store')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->get('/universidade/private/app')
            ->assertForbidden()
            ->assertHeader('Cache-Control', 'private, no-store');
    }

    public function test_admin_endpoints_reject_anonymous_access(): void
    {
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();
        $this->get('/universidade/private/admin/app')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses', ['title' => 'Demo'])->assertForbidden();
        $this->patchJson('/universidade/private/admin/courses/1', ['title' => 'Demo'])->assertForbidden();
        $this->getJson('/universidade/private/admin/courses/1/lessons')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses/1/lessons', ['title' => 'Demo'])->assertForbidden();
        $this->patchJson('/universidade/private/admin/lessons/1', ['title' => 'Demo'])->assertForbidden();
        $this->deleteJson('/universidade/private/admin/lessons/1')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses/1/publish')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses/1/unpublish')->assertForbidden();
    }

    public function test_unverified_server_session_never_grants_access(): void
    {
        // Teste negativo: a presença de dados de sessão NÃO valida contrato
        // nem titularidade; provider default nega, sem consultar o banco.
        $this->withSession([
            'portal_server_credential' => 'synthetic-session-not-verified',
            'portal_company_id' => 'synthetic-company-A',
        ]);
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->postJson('/universidade/private/lessons/1/complete')->assertForbidden();
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();
        $this->postJson('/universidade/private/admin/courses/1/publish')->assertForbidden();
    }

    public function test_browser_provided_identity_headers_cannot_override_denial(): void
    {
        $this->withHeaders([
            'X-Company-Id' => 'synthetic-company-A',
            'X-Portal-Subject' => 'synthetic-user-A',
            'X-Portal-Grant' => 'true',
        ]);
        $this->getJson('/universidade/private/courses')->assertForbidden();
    }

    public function test_no_public_catalog_or_admin_interface_exists(): void
    {
        $this->getJson('/universidade/courses')->assertNotFound();
        $this->getJson('/universidade/admin')->assertNotFound();
        $this->getJson('/preview/admin.html')->assertNotFound();
    }
}
