<?php

declare(strict_types=1);

namespace App\Domain\Access;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Bounded cleanup of nonce hashes after all valid signed envelopes have
 * expired. NEVER removes a still-valid nonce, and never authorizes access.
 *
 * No scheduler, endpoint, or production binding uses this service yet.
 * Future AppSec/DBA approval must define the maintenance cadence.
 */
final readonly class PortalNonceReplayRetention
{
    private const MIN_RETENTION_SECONDS = 86400;
    private const MAX_BATCH_SIZE = 500;

    public function pruneExpired(int $nowEpoch, int $batchSize = 100): int
    {
        if ($nowEpoch <= self::MIN_RETENTION_SECONDS
            || $batchSize < 1
            || $batchSize > self::MAX_BATCH_SIZE) {
            return 0;
        }

        $cutoff = $nowEpoch - self::MIN_RETENTION_SECONDS;

        try {
            return DB::transaction(static function () use ($cutoff, $batchSize): int {
                // Select bounded primary keys so large historical tables do
                // not cause unbounded DELETE statements or lock contention.
                $ids = DB::table('educational_portal_replay_nonces')
                    ->where('expires_at_epoch', '<', $cutoff)
                    ->orderBy('id')
                    ->limit($batchSize)
                    ->pluck('id')->all();

                if ($ids === []) {
                    return 0;
                }

                return DB::table('educational_portal_replay_nonces')
                    ->whereIn('id', $ids)
                    ->where('expires_at_epoch', '<', $cutoff)
                    ->delete();
            });
        } catch (Throwable) {
            // If cleanup fails, retaining a hash is safer than disabling
            // replay checks or deleting an unexpired reservation.
            return 0;
        }
    }
}
