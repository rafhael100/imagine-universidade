<?php

declare(strict_types=1);

namespace App\Domain\Access;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * One-use reservation for a cryptographically validated Portal envelope.
 *
 * It NEVER grants PortalAccessGate rights, authorizes an HTTP request, or
 * validates a paid active service. The default PortalAuthority stays deny-all.
 *
 * Use only after signature/issuer/audience/tenant have been verified by a
 * trusted backend. Future integration must also verify current revocation
 * and eligible contract at the point the resource is requested.
 */
final readonly class PortalSignedNonceReplayFence
{
    public function reserveOnce(PortalSignedClaimCandidate $candidate, int $nowEpoch): bool
    {
        $startedAt = hrtime(true);
        if ($nowEpoch <= 0
            || $candidate->revision < 1
            || $candidate->issuedAtEpoch > $nowEpoch
            || $candidate->issuedAtEpoch < $nowEpoch - 30
            || $candidate->expiresAtEpoch <= $nowEpoch
            || $candidate->expiresAtEpoch > $nowEpoch + 60
            || $candidate->expiresAtEpoch <= $candidate->issuedAtEpoch
            || preg_match('/\A[a-f0-9]{32}\z/D', $candidate->nonce) !== 1
        ) {
            return false;
        }

        try {
            // Atomic unique insert: parallel requests for the same nonce
            // cannot both succeed (PostgreSQL and SQLite).
            $inserted = DB::table('educational_portal_replay_nonces')->insertOrIgnore([
                'nonce_sha256' => hash('sha256', $candidate->nonce),
                'expires_at_epoch' => $candidate->expiresAtEpoch,
                'consumed_at' => now(),
            ]);

            // SQL may wait for a lock while the signed claim expires. Advance
            // the caller's epoch by monotonic elapsed time, rounding up just
            // as PortalAccessGate does. Never replace the synthetic caller's
            // clock with wall time or accept an already expired candidate.
            $elapsedNs = hrtime(true) - $startedAt;
            $checkedAt = $nowEpoch + intdiv($elapsedNs + 999_999_999, 1_000_000_000);

            // A late/uncertain response must NOT release a consumed nonce:
            // leave the unique hash in place so no replay can reuse it.
            return $inserted === 1 && $candidate->expiresAtEpoch > $checkedAt;
        } catch (Throwable) {
            // Database error/outage is ALWAYS deny, never allow on failure.
            return false;
        }
    }
}
