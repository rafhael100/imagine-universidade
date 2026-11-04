<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Representação SOMENTE para mocks C-00.
 * Nunca aceitar estes campos diretamente de um navegador como prova de direito.
 */
final readonly class AccessSnapshot
{
    public function __construct(
        public string $requestedCompanyId,
        public string $authorizedCompanyId,
        public string $subjectId,
        public int $entitlementRevision,
        public bool $authorityVerified,
        public bool $identityVerified,
        public bool $companyLinkActive,
        public bool $resourcePermissionGranted,
        public bool $hasEligibleActiveService,
        public bool $trialOnly,
        public bool $revoked,
    ) {
    }
}
