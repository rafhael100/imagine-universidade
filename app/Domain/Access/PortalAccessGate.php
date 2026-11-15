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

    public function __construct(private PortalAuthority $authority)
    {
    }

    public function authorize(
        string $serverSessionCredential,
        string $companyId,
        string $permission,
        int $nowEpoch,
    ): PortalGrant {
        if (
            trim($serverSessionCredential) === '' ||
            trim($companyId) === '' ||
            $nowEpoch <= 0 ||
            !in_array($permission, [self::VIEW, self::MANAGE], true)
        ) {
            return PortalGrant::deny('invalid_context');
        }

        try {
            $grant = $this->authority->verify($serverSessionCredential, $companyId, $permission);
        } catch (Throwable) {
            return PortalGrant::deny('authority_unavailable');
        }

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
        if (strlen($grant->companyId) > 80 || strlen($grant->subjectId) > 120) {
            return PortalGrant::deny('invalid_grant');
        }

        if ($grant->expiresAtEpoch > $nowEpoch + 60) {
            return PortalGrant::deny('invalid_grant');
        }

        if ($grant->expiresAtEpoch <= $nowEpoch) {
            return PortalGrant::deny('expired');
        }

        return $grant;
    }
}
