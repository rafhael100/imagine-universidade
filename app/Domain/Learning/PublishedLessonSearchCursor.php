<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use JsonException;

/** An authenticated navigation bound, never an authorization or stored snapshot. */
final class PublishedLessonSearchCursor
{
    public const MAX_LENGTH = 2048;
    private const PURPOSE = 'university.published-lesson-search.v1';
    private const ANCHOR_FIELDS = [
        'course_sort_order', 'course_id', 'course_version_id', 'course_version',
        'lesson_sort_order', 'lesson_id',
    ];

    /** @param array<string, int> $anchor */
    public function encode(string $normalizedQuery, array $anchor): string
    {
        if (!$this->validAnchor($anchor)) {
            throw new \UnexpectedValueException('Invalid published search anchor.');
        }
        $cursor = 's1.'.Crypt::encryptString(json_encode([
            'purpose' => self::PURPOSE,
            'query_hash' => hash('sha256', mb_strtolower($normalizedQuery, 'UTF-8')),
            ...$anchor,
        ], JSON_THROW_ON_ERROR));
        if (strlen($cursor) > self::MAX_LENGTH) {
            throw new \UnexpectedValueException('Invalid published search cursor.');
        }
        return $cursor;
    }

    /** @return array<string, int>|null */
    public function decode(string $cursor, string $normalizedQuery): ?array
    {
        if (strlen($cursor) > self::MAX_LENGTH
            || preg_match('/\As1\.[A-Za-z0-9+\/=]+\z/D', $cursor) !== 1) {
            return null;
        }
        try {
            $data = json_decode(Crypt::decryptString(substr($cursor, 3)), true, 4, JSON_THROW_ON_ERROR);
        } catch (DecryptException | JsonException) {
            return null;
        }
        if (!is_array($data) || count($data) !== 8 || ($data['purpose'] ?? null) !== self::PURPOSE
            || !is_string($data['query_hash'] ?? null)
            || !hash_equals(hash('sha256', mb_strtolower($normalizedQuery, 'UTF-8')), $data['query_hash'])) {
            return null;
        }
        unset($data['purpose'], $data['query_hash']);
        if (!$this->validAnchor($data)) {
            return null;
        }
        // Keep one canonical field order for comparison with the current row.
        $anchor = [];
        foreach (self::ANCHOR_FIELDS as $field) {
            $anchor[$field] = $data[$field];
        }
        return $anchor;
    }

    private function validAnchor(array $anchor): bool
    {
        if (count($anchor) !== count(self::ANCHOR_FIELDS)) {
            return false;
        }
        foreach (self::ANCHOR_FIELDS as $field) {
            $minimum = str_ends_with($field, '_sort_order') ? 0 : 1;
            if (!is_int($anchor[$field] ?? null)
                || $anchor[$field] < $minimum || $anchor[$field] > 9007199254740991) {
                return false;
            }
        }
        return true;
    }
}
