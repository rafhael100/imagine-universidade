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
    public function initialize(PortalGrant $grant, int $nowEpoch): bool
    {
        if (
            !$grant->allowed ||
            $grant->permission !== PortalAccessGate::VIEW ||
            $grant->revision < 1 ||
            $grant->expiresAtEpoch <= $nowEpoch ||
            $grant->expiresAtEpoch > $nowEpoch + 60 ||
            $grant->companyId === 'imagine-editorial' ||
            trim($grant->companyId) === '' ||
            trim($grant->subjectId) === '' ||
            strlen($grant->companyId) > 80 ||
            strlen($grant->subjectId) > 120
        ) {
            return false;
        }

        return DB::transaction(function () use ($grant): bool {
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
