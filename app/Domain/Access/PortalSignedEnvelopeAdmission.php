<?php

declare(strict_types=1);

namespace App\Domain\Access;

use Throwable;

/**
 * Conservative admission step for a future signed Portal -> Universidade
 * backend protocol. Cryptographic verification MUST precede nonce reservation.
 *
 * The returned candidate is deliberately NOT a PortalGrant. A valid, fresh,
 * single-use signature does not establish an active service, a live Portal
 * session, a non-revoked contract, or permission to fetch any resource.
 *
 * No route or production service-provider binding calls this class yet.
 */
final readonly class PortalSignedEnvelopeAdmission
{
    public function __construct(
        private PortalSignedEnvelopeVerifier $verifier,
        private PortalSignedNonceReplayFence $replayFence,
    ) {
    }

    public function inspectAndReserve(
        string $signedEnvelope,
        string $expectedCompany,
        string $expectedPermission,
        int $nowEpoch,
    ): ?PortalSignedClaimCandidate {
        try {
            $candidate = $this->verifier->inspect(
                $signedEnvelope,
                $expectedCompany,
                $expectedPermission,
                $nowEpoch,
            );

            if ($candidate === null) {
                return null;
            }

            // Replays are denied globally, including across organizations.
            // An unavailable nonce database must also result in denial.
            return $this->replayFence->reserveOnce($candidate, $nowEpoch)
                ? $candidate
                : null;
        } catch (Throwable) {
            // No fallback accepting an envelope without both checks.
            return null;
        }
    }
}
