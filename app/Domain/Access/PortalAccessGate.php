<?php

declare(strict_types=1);

namespace App\Domain\Access;

use Throwable;

/**
 * Camada de defesa para acesso à Universidade.
 * Ainda não é uma autenticação real: provider padrão sempre nega.
 */
final readonly class PortalAccessGate
{
    public const VIEW = 'university:view';
    public const MANAGE = 'university:manage';

    public function __construct(
        private PortalAuthority $authority,
        // The production adapter must ALSO configure transport-level timeouts.
        private int $maxAuthorityReadMs = 1500,
    ) {
        if ($maxAuthorityReadMs < 1 || $maxAuthorityReadMs > 5000) {
            throw new \InvalidArgumentException('Invalid Portal verification budget.');
        }
    }

    public function authorize(
        string $serverSessionCredential,
        string $companyId,
        string $permission,
        int $nowEpoch,
    ): PortalGrant {
        if (
            trim($serverSessionCredential) === '' ||
            strlen($serverSessionCredential) > 4096 ||
            preg_match('/[\x00-\x1F\x7F]/', $serverSessionCredential) === 1 ||
            trim($companyId) === '' ||
            strlen($companyId) > 80 ||
            preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,79}\z/D', $companyId) !== 1 ||
            $nowEpoch <= 0 ||
            !in_array($permission, [self::VIEW, self::MANAGE], true)
        ) {
            return PortalGrant::deny('invalid_context');
        }

        // An authority can revoke or expire a grant WHILE verification is
        // waiting. Never authorize from a result returned after the read
        // budget, even if the candidate carries a future-looking expiry.
        $startedAt = hrtime(true);
        try {
            $grant = $this->authority->verify($serverSessionCredential, $companyId, $permission);
        } catch (Throwable) {
            return PortalGrant::deny('authority_unavailable');
        }

        $elapsedNs = hrtime(true) - $startedAt;
        if ($elapsedNs > $this->maxAuthorityReadMs * 1_000_000) {
            return PortalGrant::deny('authority_timeout');
        }

        // nowEpoch is the caller's start-of-read epoch. Advance it
        // conservatively by elapsed monotonic seconds for expiry checks;
        // this remains deterministic in synthetic tests with an injected
        // epoch and rejects grants expiring during a slow response.
        $checkedAt = $nowEpoch + intdiv($elapsedNs + 999_999_999, 1_000_000_000);

        if (!$grant->allowed) {
            // Não converter uma negação/inconsistência da autoridade em concessão.
            return PortalGrant::deny($grant->reasonCode ?: 'access_denied');
        }

        if ($grant->companyId !== $companyId) {
            return PortalGrant::deny('wrong_company');
        }

        if (
            trim($grant->subjectId) === '' ||
            trim($grant->companyId) === '' ||
            $grant->revision < 1
        ) {
            return PortalGrant::deny('invalid_grant');
        }

        if ($grant->permission !== $permission) {
            return PortalGrant::deny('missing_permission');
        }

        // Limites compatíveis com schema candidato e concessões curtas.
        if (
            preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,79}\z/D', $grant->companyId) !== 1 ||
            preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,119}\z/D', $grant->subjectId) !== 1
        ) {
            return PortalGrant::deny('invalid_grant');
        }

        if ($grant->expiresAtEpoch > $nowEpoch + 60) {
            return PortalGrant::deny('invalid_grant');
        }

        if ($grant->expiresAtEpoch <= $checkedAt) {
            return PortalGrant::deny('expired');
        }

        return $grant;
    }
}
