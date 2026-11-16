<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;

/**
 * Provisionamento idempotente do tenant de estudo.
 *
 * Somente recebe PortalGrant VALIDADO pelo middleware no backend.
 * Sem autorização oficial, não cria empresa nem concede permissão.
 * Não cria contas, autenticação, catálogo ou acesso ao Portal.
 */
final class UniversityTenantProvisioner
{
    public function initialize(PortalGrant $grant, int $nowEpoch, ?callable $verifyFreshGrant = null): bool
    {
        if (
            !$grant->allowed ||
            $grant->permission !== PortalAccessGate::VIEW ||
            $grant->revision < 1 ||
            $grant->expiresAtEpoch <= $nowEpoch ||
            $grant->expiresAtEpoch > $nowEpoch + 60 ||
            $grant->companyId === 'imagine-editorial' ||
            preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,79}\z/D', $grant->companyId) !== 1 ||
            preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,119}\z/D', $grant->subjectId) !== 1
        ) {
            return false;
        }

        return DB::transaction(function () use ($grant, $verifyFreshGrant): bool {
            // Pode ter havido espera no banco depois do primeiro check.
            $nowEpoch = time();
            if ($grant->expiresAtEpoch <= $nowEpoch ||
                $grant->expiresAtEpoch > $nowEpoch + 60) {
                return false;
            }

            // A sessão, contrato e revisão devem continuar válidos no
            // limite da transação. Nenhuma chamada interna pode criar tenant
            // apenas apresentando um PortalGrant construído localmente.
            if ($verifyFreshGrant === null) {
                return false;
            }
            try {
                $latest = $verifyFreshGrant();
            } catch (\Throwable) {
                return false;
            }

            if (!$latest instanceof PortalGrant
                || !$latest->allowed
                || $latest->permission !== PortalAccessGate::VIEW
                || $latest->companyId !== $grant->companyId
                || $latest->subjectId !== $grant->subjectId
                || $latest->revision !== $grant->revision
                || $latest->expiresAtEpoch <= time()
                || $latest->expiresAtEpoch > time() + 60) {
                return false;
            }

            $now = now();

            // A UNIQUE key de synthetic_key dá idempotência com concorrência.
            DB::table('educational_organizations')->insertOrIgnore([
                'synthetic_key' => $grant->companyId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return DB::table('educational_organizations')
                ->where('synthetic_key', $grant->companyId)
                ->exists();
        });
    }
}
