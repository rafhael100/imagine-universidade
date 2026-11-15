<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Implementação segura por padrão: não há integração real com o Portal.
 * Trocar somente após revisão do contrato, assinatura, sessão e LGPD.
 */
final class UnavailablePortalAuthority implements PortalAuthority
{
    public function verify(
        string $serverSessionCredential,
        string $companyId,
        string $permission,
    ): PortalGrant {
        return PortalGrant::deny('authority_unavailable');
    }
}
