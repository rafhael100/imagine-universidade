<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Resultado de uma verificação BACKEND-TO-BACKEND feita pelo Portal.
 * Nunca construir um grant com parâmetros vindos do navegador.
 *
 * A assinatura, a sessão, a revogação, o vínculo e a permissão devem ser
 * verificados pelo adaptador de produção ANTES de retornar allow().
 */
final readonly class PortalGrant
{
    private function __construct(
        public bool $allowed,
        public string $reasonCode,
        public string $companyId,
        public string $subjectId,
        public string $permission,
        public int $revision,
        public int $expiresAtEpoch,
    ) {
    }

    public static function deny(string $reason = 'access_denied'): self
    {
        return new self(false, $reason, '', '', '', 0, 0);
    }

    /**
     * Uso exclusivo do adaptador confiável pós-verificação real.
     * Nunca chamar allow() com claims autoafirmadas pelo cliente.
     */
    public static function allow(
        string $companyId,
        string $subjectId,
        string $permission,
        int $revision,
        int $expiresAtEpoch,
    ): self {
        return new self(true, 'authorized', $companyId, $subjectId, $permission, $revision, $expiresAtEpoch);
    }
}
