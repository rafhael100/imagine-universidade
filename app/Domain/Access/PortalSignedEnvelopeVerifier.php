<?php
declare(strict_types=1);

namespace App\Domain\Access;

use JsonException;
use Throwable;

/**
 * Pure Ed25519 parser for a future signed backend Portal contract.
 * NOT a grant, session, subscription check, or authority adapter.
 * Format: uni-v1.base64url(json).base64url(signature).
 */
final readonly class PortalSignedEnvelopeVerifier
{
    /** @param array<string,string> $trustedPublicKeys raw Ed25519 public keys */
    public function __construct(private array $trustedPublicKeys = [])
    {
    }

    public function inspect(
        string $envelope,
        string $company,
        string $permission,
        int $now,
    ): ?PortalSignedClaimCandidate {
        if ($now <= 0 || trim($company) === ''
            || !in_array($permission, [PortalAccessGate::VIEW, PortalAccessGate::MANAGE], true)
            || !extension_loaded('sodium')
            || strlen($envelope) > 4096
            || preg_match('/\Auni-v1\.([A-Za-z0-9_-]{32,3000})\.([A-Za-z0-9_-]{86})\z/D', $envelope, $m) !== 1
        ) {
            return null;
        }

        $json = self::decodeUrl($m[1]);
        $signature = self::decodeUrl($m[2]);
        if ($json === null || $signature === null || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return null;
        }

        try {
            $claims = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }
        if (!is_array($claims) || array_is_list($claims)) {
            return null;
        }

        $required = ['aud','exp','iat','iss','kid','nonce','org','perm','rev','sub'];
        $actual = array_keys($claims);
        sort($actual);
        if ($actual !== $required) {
            return null;
        }

        $kid = $claims['kid'];
        if (!is_string($kid) || preg_match('/\A[A-Za-z0-9_-]{1,32}\z/D', $kid) !== 1) {
            return null;
        }
        $key = $this->trustedPublicKeys[$kid] ?? null;
        if (!is_string($key) || strlen($key) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
            return null;
        }

        try {
            if (!sodium_crypto_sign_verify_detached($signature, 'uni-v1.'.$m[1], $key)) {
                return null;
            }
        } catch (Throwable) {
            return null;
        }

        if ($claims['iss'] !== 'imagine-portal'
            || $claims['aud'] !== 'imagine-universidade'
            || !is_string($claims['org'])
            || !is_string($claims['sub'])
            || !is_string($claims['perm'])
            || !is_string($claims['nonce'])
            || preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,79}\z/D', $claims['org']) !== 1
            || preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,119}\z/D', $claims['sub']) !== 1
            || preg_match('/\A[a-f0-9]{32}\z/D', $claims['nonce']) !== 1
            || $claims['org'] !== $company
            || $claims['perm'] !== $permission
            || !is_int($claims['rev'])
            || !is_int($claims['iat'])
            || !is_int($claims['exp'])
            || $claims['rev'] < 1
            || $claims['iat'] > $now
            || $claims['iat'] < $now - 30
            || $claims['exp'] <= $now
            || $claims['exp'] > $now + 60
            || $claims['exp'] <= $claims['iat']
        ) {
            return null;
        }

        return new PortalSignedClaimCandidate(
            $claims['org'],
            $claims['sub'],
            $claims['perm'],
            $claims['rev'],
            $claims['iat'],
            $claims['exp'],
            $claims['nonce'],
        );
    }

    private static function decodeUrl(string $segment): ?string
    {
        if ($segment === '' || preg_match('/\A[A-Za-z0-9_-]+\z/D', $segment) !== 1) {
            return null;
        }
        $b64 = strtr($segment, '-_', '+/');
        $bytes = base64_decode($b64.str_repeat('=', (4 - strlen($b64) % 4) % 4), true);
        if ($bytes === false) {
            return null;
        }
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=') === $segment
            ? $bytes
            : null;
    }
}
