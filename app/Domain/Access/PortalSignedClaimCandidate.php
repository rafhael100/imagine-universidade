<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Parsed cryptographic envelope claim. NOT a Portal authorization decision.
 *
 * A valid signature cannot prove that a membership or paid service is still
 * active: only a live trusted Portal decision, revocation and session
 * binding can do that. No code may convert this object into a PortalGrant.
 */
final readonly class PortalSignedClaimCandidate
{
    public function __construct(
        public string $companyId,
        public string $subjectId,
        public string $permission,
        public int $revision,
        public int $issuedAtEpoch,
        public int $expiresAtEpoch,
        public string $nonce,
    ) {
    }

    public function mayAuthorizeAccess(): bool
    {
        return false;
    }

    public function provesActiveService(): bool
    {
        return false;
    }

    public function provesSessionNotRevoked(): bool
    {
        return false;
    }
}
