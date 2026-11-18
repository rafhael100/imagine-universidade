<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use JsonException;

/**
 * Concurrency preconditions, never credentials or an alternative authority.
 * Initial absence is represented without writing a slot during a GET.
 */
final class ReadingPositionRevision
{
    public const MAX_LENGTH = 2048;
    public const ABSENCE_TTL_SECONDS = 300;
    private const PURPOSE = 'university.reading-position.absent.v1';

    public function next(): string
    {
        return 'r1.'.bin2hex(random_bytes(32));
    }

    public function isStored(string $revision): bool
    {
        return preg_match('/\Ar1\.[a-f0-9]{64}\z/D', $revision) === 1;
    }

    public function absent(PortalGrant $grant, int $nowEpoch): string
    {
        return 'a1.'.Crypt::encryptString(json_encode([
            'purpose' => self::PURPOSE,
            'company' => $grant->companyId,
            'subject' => $grant->subjectId,
            'permission' => PortalAccessGate::VIEW,
            'grant_revision' => $grant->revision,
            'issued_at' => $nowEpoch,
            'expires_at' => $nowEpoch + self::ABSENCE_TTL_SECONDS,
        ], JSON_THROW_ON_ERROR));
    }

    public function matchesAbsence(string $revision, PortalGrant $grant, int $nowEpoch): bool
    {
        if (strlen($revision) > self::MAX_LENGTH || !str_starts_with($revision, 'a1.')) {
            return false;
        }
        try {
            $data = json_decode(Crypt::decryptString(substr($revision, 3)), true, 8, JSON_THROW_ON_ERROR);
        } catch (DecryptException | JsonException) {
            return false;
        }

        return is_array($data)
            && count($data) === 7
            && ($data['purpose'] ?? null) === self::PURPOSE
            && ($data['company'] ?? null) === $grant->companyId
            && ($data['subject'] ?? null) === $grant->subjectId
            && ($data['permission'] ?? null) === PortalAccessGate::VIEW
            && $grant->permission === PortalAccessGate::VIEW
            && ($data['grant_revision'] ?? null) === $grant->revision
            && is_int($data['issued_at'] ?? null)
            && is_int($data['expires_at'] ?? null)
            && $data['issued_at'] > 0
            && $data['issued_at'] <= $nowEpoch
            && $data['expires_at'] > $nowEpoch
            && $data['expires_at'] - $data['issued_at'] === self::ABSENCE_TTL_SECONDS;
    }
}
