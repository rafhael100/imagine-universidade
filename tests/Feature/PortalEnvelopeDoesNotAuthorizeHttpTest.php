<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalSignedEnvelopeAdmission;
use App\Domain\Access\PortalSignedEnvelopeVerifier;
use App\Domain\Access\PortalSignedNonceReplayFence;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Cross-boundary negative tests. A valid Ed25519 envelope + unused nonce is
 * still NOT a Portal session, an active service, or a live authorization.
 * Production's UnavailablePortalAuthority is deliberately never replaced.
 */
final class PortalEnvelopeDoesNotAuthorizeHttpTest extends TestCase
{
    private const NOW = 1800000000;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);

        if (!extension_loaded('sodium')) {
            self::markTestSkipped('Ed25519 integration requires ext-sodium.');
        }
    }

    /** @return array{0: string, 1: string} */
    private function signed(string $permission, string $nonce): array
    {
        $keyPair = sodium_crypto_sign_keypair();
        $publicKey = sodium_crypto_sign_publickey($keyPair);
        $secretKey = sodium_crypto_sign_secretkey($keyPair);
        $claims = [
            'iss' => 'imagine-portal',
            'aud' => 'imagine-universidade',
            'kid' => 'synthetic-only-key',
            'org' => 'synthetic-company-a',
            'sub' => 'synthetic-student-a',
            'perm' => $permission,
            'rev' => 3,
            'iat' => self::NOW - 5,
            'exp' => self::NOW + 30,
            'nonce' => $nonce,
        ];
        $json = json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $body = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
        $signature = sodium_crypto_sign_detached('uni-v1.'.$body, $secretKey);
        $signed = 'uni-v1.'.$body.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        return [$signed, $publicKey];
    }

    public function test_cryptographically_accepted_candidate_does_not_open_student_routes(): void
    {
        [$signed, $key] = $this->signed(PortalAccessGate::VIEW, str_repeat('a', 32));
        $admission = new PortalSignedEnvelopeAdmission(
            new PortalSignedEnvelopeVerifier(['synthetic-only-key' => $key]),
            new PortalSignedNonceReplayFence(),
        );
        $candidate = $admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        );
        self::assertNotNull($candidate);
        self::assertFalse($candidate->mayAuthorizeAccess());
        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());

        // Neither an HTTP header nor query/body nor a manually populated
        // server-side session is the authenticated business session of Portal.
        $this->withHeaders([
            'X-Portal-Envelope' => $signed,
            'X-Portal-Subject' => 'synthetic-student-a',
            'X-Company-Id' => 'synthetic-company-a',
            'Authorization' => 'Bearer '.$signed,
        ]);
        $this->withSession([
            'portal_server_credential' => $signed,
            'portal_company_id' => 'synthetic-company-a',
        ]);

        $this->getJson('/universidade/private/courses?company=synthetic-company-a')
            ->assertForbidden();
        $this->get('/universidade/private/app')->assertForbidden();
        $this->postJson('/universidade/private/initialize', [
            'portal_company_id' => 'synthetic-company-a',
            'envelope' => $signed,
        ])->assertForbidden();
        $this->postJson('/universidade/private/lessons/1/complete', [
            'envelope' => $signed,
        ])->assertForbidden();
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();

        self::assertSame(0, DB::table('educational_organizations')->count());
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());
    }

    public function test_signed_manage_claim_cannot_create_courses_or_publish_without_live_authority(): void
    {
        [$signed, $key] = $this->signed(PortalAccessGate::MANAGE, str_repeat('b', 32));
        $admission = new PortalSignedEnvelopeAdmission(
            new PortalSignedEnvelopeVerifier(['synthetic-only-key' => $key]),
            new PortalSignedNonceReplayFence(),
        );
        self::assertNotNull($admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::MANAGE, self::NOW,
        ));

        $this->withSession([
            'portal_server_credential' => $signed,
            'portal_company_id' => 'synthetic-company-a',
        ]);

        $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-indevido',
            'title' => 'Curso que nao pode ser criado',
            'category' => 'negocios',
            'envelope' => $signed,
        ])->assertForbidden();
        $this->postJson('/universidade/private/admin/courses/1/publish')
            ->assertForbidden();
        $this->deleteJson('/universidade/private/admin/courses/1')
            ->assertForbidden();
        self::assertSame(0, DB::table('educational_courses')->count());
        self::assertSame(0, DB::table('educational_audit_events')->count());
    }

    public function test_missing_replay_ledger_denies_admission_and_all_http_access(): void
    {
        [$signed, $key] = $this->signed(PortalAccessGate::VIEW, str_repeat('c', 32));
        Schema::drop('educational_portal_replay_nonces');
        $admission = new PortalSignedEnvelopeAdmission(
            new PortalSignedEnvelopeVerifier(['synthetic-only-key' => $key]),
            new PortalSignedNonceReplayFence(),
        );
        self::assertNull($admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));

        $this->withSession([
            'portal_server_credential' => $signed,
            'portal_company_id' => 'synthetic-company-a',
        ]);
        $this->getJson('/universidade/private/courses')->assertForbidden();
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();
    }
}
