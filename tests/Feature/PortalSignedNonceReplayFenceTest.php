<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalSignedClaimCandidate;
use App\Domain\Access\PortalSignedEnvelopeVerifier;
use App\Domain\Access\PortalSignedNonceReplayFence;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class PortalSignedNonceReplayFenceTest extends TestCase
{
    private const NOW = 1800000000;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
    }

    private function candidate(
        string $nonce = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        int $issued = self::NOW - 5,
        int $expiry = self::NOW + 30,
        string $company = 'synthetic-company-a',
    ): PortalSignedClaimCandidate {
        return new PortalSignedClaimCandidate(
            $company, 'synthetic-person-a', PortalAccessGate::VIEW, 3,
            $issued, $expiry, $nonce,
        );
    }

    public function test_first_reservation_succeeds_and_replay_always_fails(): void
    {
        $fence = new PortalSignedNonceReplayFence();
        self::assertTrue($fence->reserveOnce($this->candidate(), self::NOW));
        self::assertFalse($fence->reserveOnce($this->candidate(), self::NOW));

        // Switching tenants cannot bypass global single-use nonce storage.
        self::assertFalse($fence->reserveOnce(
            $this->candidate(company: 'synthetic-company-b'), self::NOW,
        ));

        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());
        $record = DB::table('educational_portal_replay_nonces')->first();
        self::assertSame(hash('sha256', str_repeat('a', 32)), $record->nonce_sha256);
        self::assertNotSame(str_repeat('a', 32), $record->nonce_sha256);
        self::assertSame(self::NOW + 30, (int) $record->expires_at_epoch);
        self::assertFalse(Schema::hasColumn('educational_portal_replay_nonces', 'subject_id'));
        self::assertFalse(Schema::hasColumn('educational_portal_replay_nonces', 'company_id'));
    }

    public function test_independent_nonces_can_be_reserved_but_invalid_claims_cannot(): void
    {
        $fence = new PortalSignedNonceReplayFence();
        self::assertTrue($fence->reserveOnce($this->candidate(), self::NOW));
        self::assertTrue($fence->reserveOnce(
            $this->candidate(nonce: str_repeat('b', 32)), self::NOW,
        ));
        self::assertSame(2, DB::table('educational_portal_replay_nonces')->count());

        foreach ([
            $this->candidate(nonce: 'not-a-nonce'),
            $this->candidate(issued: self::NOW + 1),
            $this->candidate(issued: self::NOW - 31),
            $this->candidate(expiry: self::NOW),
            $this->candidate(expiry: self::NOW + 61),
            $this->candidate(issued: self::NOW - 5, expiry: self::NOW - 1),
        ] as $invalid) {
            self::assertFalse($fence->reserveOnce($invalid, self::NOW));
        }
        self::assertFalse($fence->reserveOnce($this->candidate(), 0));
        self::assertSame(2, DB::table('educational_portal_replay_nonces')->count());
    }

    public function test_backend_database_outage_denies_reservation_without_fallback(): void
    {
        Schema::drop('educational_portal_replay_nonces');
        self::assertFalse((new PortalSignedNonceReplayFence())
            ->reserveOnce($this->candidate(), self::NOW));
    }

    public function test_signed_envelope_can_be_reserved_only_once_without_grant(): void
    {
        if (!extension_loaded('sodium')) {
            self::markTestSkipped('ext-sodium is required for Ed25519 fixture.');
        }

        $keys = sodium_crypto_sign_keypair();
        $public = sodium_crypto_sign_publickey($keys);
        $secret = sodium_crypto_sign_secretkey($keys);
        $claims = [
            'iss' => 'imagine-portal',
            'aud' => 'imagine-universidade',
            'kid' => 'synthetic-k1',
            'org' => 'synthetic-company-a',
            'sub' => 'synthetic-person-a',
            'perm' => PortalAccessGate::VIEW,
            'rev' => 3,
            'iat' => self::NOW - 5,
            'exp' => self::NOW + 30,
            'nonce' => str_repeat('e', 32),
        ];
        $json = json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $part = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
        $signed = 'uni-v1.'.$part.'.'.rtrim(strtr(
            base64_encode(sodium_crypto_sign_detached('uni-v1.'.$part, $secret)),
            '+/', '-_',
        ), '=');
        $verifier = new PortalSignedEnvelopeVerifier(['synthetic-k1' => $public]);
        $candidate = $verifier->inspect(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        );
        self::assertNotNull($candidate);
        self::assertFalse($candidate->mayAuthorizeAccess());
        $fence = new PortalSignedNonceReplayFence();
        self::assertTrue($fence->reserveOnce($candidate, self::NOW));
        self::assertFalse($fence->reserveOnce($candidate, self::NOW));
        self::assertSame(1, DB::table('educational_portal_replay_nonces')->count());
    }
}
