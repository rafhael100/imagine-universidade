<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalSignedEnvelopeVerifier;
use PHPUnit\Framework\TestCase;

final class PortalSignedEnvelopeVerifierTest extends TestCase
{
    private const NOW = 1800000000;

    protected function setUp(): void
    {
        parent::setUp();
        if (!extension_loaded('sodium')) {
            self::markTestSkipped('Test requires ext-sodium.');
        }
    }

    /** @return array<string,mixed> */
    private function claims(): array
    {
        return [
            'iss' => 'imagine-portal',
            'aud' => 'imagine-universidade',
            'kid' => 'synthetic-key',
            'org' => 'synthetic-company-a',
            'sub' => 'synthetic-person-a',
            'perm' => PortalAccessGate::VIEW,
            'rev' => 2,
            'iat' => self::NOW - 5,
            'exp' => self::NOW + 30,
            'nonce' => str_repeat('a', 32),
        ];
    }

    /** @param array<string,mixed> $claims */
    private function sign(array $claims, string $secretKey): string
    {
        $json = json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $part = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
        $signature = sodium_crypto_sign_detached('uni-v1.'.$part, $secretKey);
        return 'uni-v1.'.$part.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }

    public function test_valid_signature_produces_only_a_non_authorizing_candidate(): void
    {
        $keys = sodium_crypto_sign_keypair();
        $public = sodium_crypto_sign_publickey($keys);
        $secret = sodium_crypto_sign_secretkey($keys);
        $result = (new PortalSignedEnvelopeVerifier(['synthetic-key' => $public]))
            ->inspect($this->sign($this->claims(), $secret), 'synthetic-company-a',
                PortalAccessGate::VIEW, self::NOW);

        self::assertNotNull($result);
        self::assertSame('synthetic-company-a', $result->companyId);
        self::assertSame('synthetic-person-a', $result->subjectId);
        self::assertSame(2, $result->revision);
        self::assertFalse($result->mayAuthorizeAccess());
        self::assertFalse($result->provesActiveService());
        self::assertFalse($result->provesSessionNotRevoked());
    }

    public function test_missing_key_wrong_key_and_modified_payload_fail(): void
    {
        $keypair = sodium_crypto_sign_keypair();
        $signed = $this->sign($this->claims(), sodium_crypto_sign_secretkey($keypair));
        $company = 'synthetic-company-a';
        self::assertNull((new PortalSignedEnvelopeVerifier())
            ->inspect($signed, $company, PortalAccessGate::VIEW, self::NOW));

        $other = sodium_crypto_sign_keypair();
        self::assertNull((new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($other),
        ]))->inspect($signed, $company, PortalAccessGate::VIEW, self::NOW));

        $tampered = str_replace('uni-v1.', 'uni-v1.A', $signed);
        self::assertNull((new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($keypair),
        ]))->inspect($tampered, $company, PortalAccessGate::VIEW, self::NOW));
    }

    public function test_signed_claims_from_wrong_issuer_audience_tenant_or_permission_fail(): void
    {
        $keypair = sodium_crypto_sign_keypair();
        $verifier = new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($keypair),
        ]);
        $secret = sodium_crypto_sign_secretkey($keypair);

        foreach ([
            ['iss', 'external-issuer'],
            ['aud', 'imagine-crm'],
            ['org', 'synthetic-company-b'],
            ['perm', PortalAccessGate::MANAGE],
            ['perm', 'university:*'],
            ['sub', ''],
            ['nonce', 'bad-nonce'],
            ['kid', 'unknown-key'],
        ] as [$name, $value]) {
            $claims = $this->claims();
            $claims[$name] = $value;
            self::assertNull($verifier->inspect(
                $this->sign($claims, $secret),
                'synthetic-company-a',
                PortalAccessGate::VIEW,
                self::NOW,
            ), 'Invalid field was accepted: '.$name);
        }
    }

    public function test_expiry_clock_skew_revision_and_unknown_claims_are_rejected(): void
    {
        $pair = sodium_crypto_sign_keypair();
        $verifier = new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($pair),
        ]);
        $secret = sodium_crypto_sign_secretkey($pair);
        foreach ([
            ['exp', self::NOW],
            ['exp', self::NOW + 61],
            ['iat', self::NOW + 1],
            ['iat', self::NOW - 31],
            ['rev', 0],
            ['rev', '2'],
            ['iat', '1800000000'],
        ] as [$field, $value]) {
            $claims = $this->claims();
            $claims[$field] = $value;
            self::assertNull($verifier->inspect(
                $this->sign($claims, $secret),
                'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
            ), 'Temporal/revision claim accepted: '.$field);
        }

        $claims = $this->claims();
        $claims['root'] = true;
        self::assertNull($verifier->inspect(
            $this->sign($claims, $secret),
            'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
    }

    public function test_manage_and_view_are_exact_independent_capabilities(): void
    {
        $pair = sodium_crypto_sign_keypair();
        $claims = $this->claims();
        $claims['perm'] = PortalAccessGate::MANAGE;
        $signed = $this->sign($claims, sodium_crypto_sign_secretkey($pair));
        $verifier = new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($pair),
        ]);

        self::assertNull($verifier->inspect(
            $signed, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
        $candidate = $verifier->inspect(
            $signed, 'synthetic-company-a', PortalAccessGate::MANAGE, self::NOW,
        );
        self::assertNotNull($candidate);
        self::assertFalse($candidate->mayAuthorizeAccess());
    }

    public function test_malformed_encoding_and_invalid_signature_are_rejected(): void
    {
        $pair = sodium_crypto_sign_keypair();
        $verifier = new PortalSignedEnvelopeVerifier([
            'synthetic-key' => sodium_crypto_sign_publickey($pair),
        ]);
        foreach ([
            '',
            'uni-v1.not-base64.abc',
            'uni-v2.abc.abc',
            str_repeat('A', 4097),
            'uni-v1.===.===',
        ] as $payload) {
            self::assertNull($verifier->inspect(
                $payload, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
            ));
        }

        $valid = $this->sign($this->claims(), sodium_crypto_sign_secretkey($pair));
        $last = substr($valid, -1);
        $tampered = substr($valid, 0, -1).($last === 'A' ? 'B' : 'A');
        self::assertNull($verifier->inspect(
            $tampered, 'synthetic-company-a', PortalAccessGate::VIEW, self::NOW,
        ));
    }
}
