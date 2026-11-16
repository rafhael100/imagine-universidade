<?php

declare(strict_types=1);

namespace App\Domain\Access;

interface PortalAuthority
{
    /**
     * Consultar o Portal com credencial opaca vinculada à sessão no servidor.
     * Na implementação real, NUNCA confiar em company/subject/roles recebidos
     * diretamente do cliente; conferir revogação e elegibilidade a cada pedido.
     */
    public function verify(
        string $serverSessionCredential,
        string $companyId,
        string $permission,
    ): PortalGrant;
}
