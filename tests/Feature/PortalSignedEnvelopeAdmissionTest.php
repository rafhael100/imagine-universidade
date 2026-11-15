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
 * Synthetic cryptographic-and-persistence tests only.
 * These do not implement or simulate a real Portal session.
 */
final class PortalSignedEnvelopeAdmissionTest extends TestCase
{
    private const NOW = 1800000000;

    private string $secretKey;

    private PortalSignedEnvelopeAdmission $admission;

    protected function setUp(): void
    {
        parent::setUp();

        if (!extension_loaded('sodium')) {
            self::markTestSkipped('Ed25519 requires ext-sodium.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);

        $keyPair = sodium_crypto_sign_keypair();
        $this->secretKey = sodium_crypto_sign_secretkey($keyPair);
        $verifier = new PortalSignedEnvelopeVerifier([
            'synthetic-admission-key' => sodium_crypto_sign_publickey($keyPair),
        ]);
        $this->admission = new PortalSignedEnvelopeAdmission(
            $verifier,
            new PortalSignedNonceReplayFence(),
        );
    }

    private function signed(
        string $nonce = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        string $company = 'synthetic-company-a',
        string $permission = PortalAccessGate::VIEW,
        int $issued = self::NOW - 5,
        int $expires = self::NOW + 30,
    ): string {
        $claims = [
            'iss' => 'imagine-portal',
            'aud' => 'imagine-universidade',
            'kid' => 'synthetic-admission-key',
            'org' => $company,
            'sub' => 'synthetic-student-a',
            'perm' => $permission,
            'rev' => 3,
            'iat' => $issued,
            'exp' => $expires,
            'nonce' => $nonce,
        ];

        $body = rtrim(strtr(base64_encode(
            json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
        ), '+/', '-_'), '=');
        $signature = sodium_crypto_sign_detached('uni-v1.'.$body, $this->secretKey);

        return 'uni-v1.'.$body.'.'.rtrim(
            strtr(base64_encode($signature), '+/', '-_'),
            '=',
        );
    }

    public function test_valid_signed_envelope_is_single_use_but_never_an_access_grant(): void
    {
        $signed = $this->signed();

        $candidate = $this->admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        );
        self::assertNotNull($candidate);
        self::assertSame('synthetic-company-a', $candidate->companyId);
        self::assertSame('synthetic-student-a', $candidate->subjectId);
        self::assertFalse($candidate->mayAuthorizeAccess());
        self::assertFalse($candidate->provesActiveService());
        self::assertFalse($candidate->provesSessionNotRevoked());
        self::assertNull($this->admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());
    }

    public function test_invalid_signature_wrong_tenant_and_wrong_permission_never_reserve_nonce(): void
    {
        $signed = $this->signed();
        $tampered = str_replace('uni-v1.', 'uni-v1.B', $signed);
        self::assertNull($this->admission->inspectAndReserve(
            $tampered, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertNull($this->admission->inspectAndReserve(
            $signed, 'synthetic-company-b', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertNull($this->admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::MANAGE, self::NOW,
        ));
        self::assertSame(0, DB::table('educational_portal_replay_nonces')->count());

        // A failed inspection must not consume the nonce of the real signed claim.
        self::assertNotNull($this->admission->inspectAndReserve(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());
    }

    public function test_reused_nonce_is_rejected_even_under_another_valid_tenant_signature(): void
    {
        self::assertNotNull($this->admission->inspectAndReserve(
            $this->signed(), 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertNull($this->admission->inspectAndReserve(
            $this->signed(company: 'synthetic-company-b'),
            'synthetic-company-b', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertNotNull($this->admission->inspectAndReserve(
            $this->signed(nonce: str_repeat('b', 32)),
            'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertSame(2, DB::table('educational_portal_replay_nonces')->count());
    }

    public function test_expired_envelope_and_unavailable_ledger_always_fail_closed(): void
    {
        $expired = $this->signed(expires: self::NOW);
        self::assertNull($this->admission->inspectAndReserve(
            $expired, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        self::assertSame(0, DB::table('educational_portal_replay_nonces')->count());

        Schema::drop('educational_portal_replay_nonces');
        self::assertNull($this->admission->inspectAndReserve(
            $this->signed(), 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
    }
}
