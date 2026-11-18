<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * C-03: consultas sempre limitadas à organização do grant VERIFICADO no servidor.
 * Não usar antes do adaptador Portal homologado e das migrações aprovadas.
 */
final class UniversityCatalogRepository
{
    private const EDITORIAL_ORGANIZATION_KEY = 'imagine-editorial';

    private function resolveOrganizationId(string $key): ?int
    {
        if (trim($key) === '' || strlen($key) > 80) {
            return null;
        }
        $id = DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
        return $id === null ? null : (int) $id;
    }

    /**
     * Defense in depth. A grant object is NOT proof of an authenticated
     * Portal session: the HTTP middleware must verify it first.
     * Never reuse grants that expired during the current operation.
     */
    private function grantUsable(PortalGrant $grant, string $permission): bool
    {
        $now = time();

        return $grant->allowed
            && $grant->permission === $permission
            && $grant->revision >= 1
            && $grant->expiresAtEpoch > $now
            && $grant->expiresAtEpoch <= $now + 60
            && preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,79}\z/D', $grant->companyId) === 1
            && preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,119}\z/D', $grant->subjectId) === 1;
    }

    /**
     * Verify authority inside a write transaction immediately before
     * mutation. A verified PortalGrant alone is insufficient to write.
     * The official Portal authority remains deny-all until homologation.
     */
    private function freshWriteGrantMatches(
        PortalGrant $expected,
        string $permission,
        ?callable $verifyFreshGrant,
    ): bool {
        if ($verifyFreshGrant === null || !$this->grantUsable($expected, $permission)) {
            return false;
        }

        try {
            $latest = $verifyFreshGrant();
        } catch (\Throwable) {
            return false;
        }

        return $latest instanceof PortalGrant
            && $this->grantUsable($latest, $permission)
            && $latest->companyId === $expected->companyId
            && $latest->subjectId === $expected->subjectId
            && $latest->permission === $expected->permission
            && $latest->revision === $expected->revision;
    }

    // O tenant do cliente contém apenas seu progresso e preferências privadas.
    private function orgId(PortalGrant $grant): ?int
    {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW) ||
            $grant->companyId === self::EDITORIAL_ORGANIZATION_KEY) {
            return null;
        }
        return $this->resolveOrganizationId($grant->companyId);
    }

    // Material editorial centralizado da Imagine; jamais edição por clientes.
    private function contentOrgId(): ?int
    {
        return $this->resolveOrganizationId(self::EDITORIAL_ORGANIZATION_KEY);
    }

    private function adminOrgId(PortalGrant $grant): ?int
    {
        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE) ||
            $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY) {
            return null;
        }
        return $this->contentOrgId();
    }

    /**
     * Catálogo publicado da Imagine, com progresso calculado somente pela
     * empresa/sujeito do grant verificado. Sem consultar outros tenants.
     *
     * @return array<int, stdClass>
     */
    public function catalog(PortalGrant $grant): array
    {
        $org = $this->orgId($grant);
        if ($org === null) {
            return [];
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return [];
        }

        $courses = DB::table('educational_courses as c')
            ->join('educational_course_versions as v', 'v.educational_course_id', '=', 'c.id')
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->orderBy('c.sort_order')
            ->orderBy('c.id')
            ->select('c.id', 'c.slug', 'c.title', 'c.summary', 'c.category',
                'c.audience', 'c.suggested_knowledge', 'v.id as version_id')
            ->get()->all();

        if ($courses === []) {
            return [];
        }

        // Única consulta agrupada, limitada às versões publicadas,
        // com LEFT JOIN restrito ao aluno/empresa autenticados.
        // Não contam conclusões de versões arquivadas nem rascunhos.
        $versionIds = array_map(static fn (stdClass $c): int => (int) $c->version_id, $courses);
        $counts = DB::table('educational_lessons as l')
            ->leftJoin('educational_lesson_progress as p', function ($join) use ($org, $grant): void {
                $join->on('p.educational_lesson_id', '=', 'l.id')
                    ->where('p.educational_organization_id', '=', $org)
                    ->where('p.subject_key', '=', $grant->subjectId);
            })
            ->whereIn('l.educational_course_version_id', $versionIds)
            ->where('l.is_published', true)
            ->groupBy('l.educational_course_version_id')
            ->select('l.educational_course_version_id')
            ->selectRaw('COUNT(l.id) AS lessons_total')
            ->selectRaw('COUNT(p.id) AS lessons_completed')
            ->get()
            ->keyBy('educational_course_version_id');

        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return [];
        }

        foreach ($courses as $course) {
            $totals = $counts->get($course->version_id);
            $course->lessons_total = (int) ($totals->lessons_total ?? 0);
            $course->lessons_completed = (int) ($totals->lessons_completed ?? 0);
            $course->progress_percent = $course->lessons_total > 0
                ? (int) round(100 * $course->lessons_completed / $course->lessons_total)
                : 0;
        }

        return $courses;
    }

    /** @return list<int> Only the current student's currently published favorites. */
    public function favoriteCourseIds(PortalGrant $grant): array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return [];
        }

        $ids = DB::table('educational_course_favorites as f')
            ->join('educational_courses as c', 'c.id', '=', 'f.educational_course_id')
            ->join('educational_course_versions as v', 'v.educational_course_id', '=', 'c.id')
            ->where('f.educational_organization_id', $org)
            ->where('f.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->distinct()->orderBy('f.educational_course_id')
            ->pluck('f.educational_course_id')
            ->map(static fn ($id): int => (int) $id)->all();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $ids : [];
    }

    /**
     * Private preference export includes retained references after withdrawal,
     * without granting access to a course's title or content. A publication
     * must have existed; an injected preference cannot expose a new draft.
     *
     * @return array{schema_version:int,scope:string,favorites:list<array{course_slug:string,saved_at:string}>}|null
     */
    public function exportFavorites(PortalGrant $grant): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }

        $entries = DB::table('educational_course_favorites as f')
            ->join('educational_courses as c', 'c.id', '=', 'f.educational_course_id')
            ->where('f.educational_organization_id', $org)
            ->where('f.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            // EXISTS preserves one preference when several archived versions
            // belong to the same course, without reading any lesson content.
            ->whereExists(static function (\Illuminate\Database\Query\Builder $query): void {
                $query->selectRaw('1')->from('educational_course_versions as v')
                    ->whereColumn('v.educational_course_id', 'c.id')
                    ->whereIn('v.status', ['published', 'archived']);
            })
            ->orderBy('f.educational_course_id')
            ->limit(5001)
            ->get(['c.slug as course_slug', 'f.created_at as saved_at'])
            ->all();

        // Refuse an incomplete file instead of silently truncating preferences.
        if (count($entries) > 5000 || !$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }

        return [
            'schema_version' => 1,
            'scope' => 'current_authenticated_student',
            'favorites' => array_map(
                static fn (stdClass $item): array => [
                    'course_slug' => (string) $item->course_slug,
                    'saved_at' => (string) $item->saved_at,
                ],
                $entries,
            ),
        ];
    }

    /** Private reference APIs use canonical UTC dates, independent of PDO formatting. */
    private function privateReferenceTimestamp(mixed $value): string
    {
        if (!is_string($value)
            || preg_match('/\A\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)?\z/D', $value) !== 1) {
            throw new \UnexpectedValueException('Invalid retained preference timestamp.');
        }
        $utc = new \DateTimeZone('UTC');
        $date = new \DateTimeImmutable($value, $utc);
        $errors = \DateTimeImmutable::getLastErrors();
        if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
            throw new \UnexpectedValueException('Invalid retained preference timestamp.');
        }
        $canonical = $date->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');
        if (preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/D', $canonical) !== 1) {
            throw new \UnexpectedValueException('Invalid retained preference timestamp.');
        }
        return $canonical;
    }

    /**
     * One metadata snapshot of the current student's retained references.
     * The cursor is only a numeric lower bound: deleting it must not invalidate
     * the next page, and a foreign cursor never changes the private scope.
     *
     * @return array<string, mixed>|string A fixed error code, never a partial page.
     */
    public function retainedFavorites(PortalGrant $grant, ?int $afterCourseId = null): array|string
    {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)
            || $grant->companyId === self::EDITORIAL_ORGANIZATION_KEY) {
            return 'access_denied';
        }
        if ($afterCourseId !== null && ($afterCourseId < 1 || $afterCourseId > 9007199254740991)) {
            return 'invalid_cursor';
        }
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return 'temporarily_unavailable';
        }

        $query = DB::table('educational_course_favorites as f')
            ->join('educational_courses as c', 'c.id', '=', 'f.educational_course_id')
            ->where('f.educational_organization_id', $org)
            ->where('f.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->whereExists(static function (\Illuminate\Database\Query\Builder $query): void {
                $query->selectRaw('1')->from('educational_course_versions as history')
                    ->whereColumn('history.educational_course_id', 'c.id')
                    ->whereIn('history.status', ['published', 'archived']);
            });
        if ($afterCourseId !== null) {
            $query->where('f.educational_course_id', '>', $afterCourseId);
        }
        $rows = $query->orderBy('f.educational_course_id')->limit(51)
            ->get(['c.id as course_id', 'c.slug as course_slug', 'f.created_at as saved_at',
                DB::raw("CASE WHEN c.is_published AND EXISTS (SELECT 1 FROM educational_course_versions AS live WHERE live.educational_course_id = c.id AND live.status = 'published') THEN 'available' ELSE 'unavailable' END AS availability"),
            ])->all();

        $favorites = [];
        $previousId = $afterCourseId ?? 0;
        foreach ($rows as $row) {
            if ((!is_int($row->course_id) && !is_string($row->course_id))
                || preg_match('/\A[1-9][0-9]{0,15}\z/D', (string) $row->course_id) !== 1
                || filter_var($row->course_id, FILTER_VALIDATE_INT, ['options' => [
                    'min_range' => 1, 'max_range' => 9007199254740991,
                ]]) === false
                || !is_string($row->course_slug)
                || preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $row->course_slug) !== 1
                || strlen($row->course_slug) > 120
                || !in_array($row->availability, ['available', 'unavailable'], true)) {
                throw new \UnexpectedValueException('Invalid retained preference metadata.');
            }
            $id = (int) $row->course_id;
            if ($id <= $previousId) {
                throw new \UnexpectedValueException('Invalid retained preference ordering.');
            }
            $favorites[] = ['course_id' => $id, 'course_slug' => $row->course_slug,
                'saved_at' => $this->privateReferenceTimestamp($row->saved_at),
                'availability' => $row->availability];
            $previousId = $id;
        }
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return 'access_denied';
        }
        // Validate the sentinel too; malformed metadata must not become a
        // successful first page with an undisclosed broken continuation.
        $hasNext = count($favorites) > 50;
        $favorites = array_slice($favorites, 0, 50);
        return [
            'schema_version' => 1,
            'scope' => 'current_authenticated_student',
            'favorites' => $favorites,
            'next_after_course_id' => $hasNext ? $favorites[49]['course_id'] : null,
        ];
    }

    /** @return array<string, mixed> */
    private function readingPositionEnvelope(string $status, string $revision, ?array $position = null): array
    {
        return [
            'schema_version' => 1,
            'scope' => 'current_authenticated_student',
            'status' => $status,
            'revision' => $revision,
            'position' => $position,
        ];
    }

    /** One private row and its exact historical reference, without content. */
    private function readingPositionRecord(int $org, string $subject): ?stdClass
    {
        return DB::table('educational_reading_positions as p')
            ->leftJoin('educational_lessons as l', 'l.id', '=', 'p.educational_lesson_id')
            ->leftJoin('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->leftJoin('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('p.educational_organization_id', $org)->where('p.subject_key', $subject)
            ->first(['p.revision', 'p.educational_lesson_id', 'p.saved_at',
                'l.id as lesson_id', 'l.slug as lesson_slug', 'l.is_published as lesson_published',
                'v.version as course_version', 'v.status as version_status',
                'c.id as course_id', 'c.slug as course_slug', 'c.educational_organization_id as content_org',
                'c.is_shared', 'c.is_published as course_published']);
    }

    private function normalizeReadingPositionRecord(stdClass $record, ReadingPositionRevision $revisions): void
    {
        if (!is_string($record->revision) || !$revisions->isStored($record->revision)
            || ($record->educational_lesson_id === null) !== ($record->saved_at === null)
            || ($record->saved_at !== null && (!is_string($record->saved_at) || trim($record->saved_at) === ''))) {
            throw new \UnexpectedValueException('Invalid private reading position.');
        }
        if ($record->saved_at !== null) {
            // PostgreSQL timestamptz can return +00, while SQLite preserves the
            // inserted string. Keep this new API independent of DB formatting.
            if (preg_match('/\A\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)?\z/D', $record->saved_at) !== 1) {
                throw new \UnexpectedValueException('Invalid private reading timestamp.');
            }
            $utc = new \DateTimeZone('UTC');
            $date = new \DateTimeImmutable($record->saved_at, $utc);
            $errors = \DateTimeImmutable::getLastErrors();
            if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
                throw new \UnexpectedValueException('Invalid private reading timestamp.');
            }
            $record->saved_at = $date->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');
        }
    }

    /** @return array<string, mixed>|null Null is unavailable, never an empty preference. */
    public function readingPosition(PortalGrant $grant, ReadingPositionRevision $revisions): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }
        $record = $this->readingPositionRecord($org, $grant->subjectId);
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }
        if ($record === null) {
            // This encrypted precondition is short-lived and creates no row.
            return $this->readingPositionEnvelope('none', $revisions->absent($grant, time()));
        }
        $this->normalizeReadingPositionRecord($record, $revisions);
        if ($record->educational_lesson_id === null) {
            return $this->readingPositionEnvelope('none', $record->revision);
        }
        if ($record->lesson_id === null || (int) $record->content_org !== $editorialOrg
            || !(bool) $record->is_shared || !(bool) $record->course_published
            || $record->version_status !== 'published' || !(bool) $record->lesson_published) {
            return $this->readingPositionEnvelope('unavailable', $record->revision);
        }

        return $this->readingPositionEnvelope('available', $record->revision, [
            'course_id' => (int) $record->course_id,
            'course_version' => (int) $record->course_version,
            'lesson_id' => (int) $record->lesson_id,
            'saved_at' => $record->saved_at,
        ]);
    }

    /** @return array<string, mixed>|null */
    public function exportReadingPosition(PortalGrant $grant, ReadingPositionRevision $revisions): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }
        $record = $this->readingPositionRecord($org, $grant->subjectId);
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }
        $position = null;
        if ($record !== null) {
            $this->normalizeReadingPositionRecord($record, $revisions);
            if ($record->educational_lesson_id !== null && $record->lesson_id !== null
                && (int) $record->content_org === $editorialOrg && (bool) $record->is_shared
                && in_array($record->version_status, ['published', 'archived'], true)) {
                $position = [
                    'course_slug' => (string) $record->course_slug,
                    'course_version' => (int) $record->course_version,
                    'lesson_slug' => (string) $record->lesson_slug,
                    'saved_at' => $record->saved_at,
                ];
            }
        }

        return ['schema_version' => 1, 'scope' => 'current_authenticated_student',
            'reading_position' => $position];
    }

    /**
     * Exact lesson/version selected by an explicit action. A stored token can
     * only update its matching private slot; it can never create a missing one.
     *
     * @return array<string, mixed>|string Snapshot, or a fixed error code.
     */
    public function saveReadingPosition(
        PortalGrant $grant,
        int $courseId,
        int $courseVersion,
        int $lessonId,
        string $expectedRevision,
        ReadingPositionRevision $revisions,
        ?callable $verifyFreshGrant = null,
    ): array|string {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return 'access_denied';
        }
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return 'temporarily_unavailable';
        }
        if ($courseId < 1 || $courseVersion < 1 || $lessonId < 1) {
            return 'not_found';
        }
        if ($expectedRevision === '' || strlen($expectedRevision) > ReadingPositionRevision::MAX_LENGTH) {
            return 'reading_position_changed';
        }

        try {
            return DB::transaction(function () use ($grant, $org, $editorialOrg, $courseId, $courseVersion,
                $lessonId, $expectedRevision, $revisions, $verifyFreshGrant): array|string {
                // Publication and preference writes share course -> version order.
                $course = DB::table('educational_courses')->where('id', $courseId)
                    ->where('educational_organization_id', $editorialOrg)
                    ->where('is_shared', true)->where('is_published', true)
                    ->lockForUpdate()->first(['id']);
                if ($course === null) {
                    return 'not_found';
                }
                $version = DB::table('educational_course_versions')->where('educational_course_id', $courseId)
                    ->where('version', $courseVersion)->where('status', 'published')
                    ->lockForUpdate()->first(['id']);
                if ($version === null || !DB::table('educational_lessons')->where('id', $lessonId)
                    ->where('educational_course_version_id', $version->id)->where('is_published', true)->exists()) {
                    return 'not_found';
                }
                $slot = DB::table('educational_reading_positions')
                    ->where('educational_organization_id', $org)->where('subject_key', $grant->subjectId);
                $current = (clone $slot)->lockForUpdate()->first(['revision']);
                if ($current !== null && (!is_string($current->revision) || !$revisions->isStored($current->revision))) {
                    throw new \UnexpectedValueException('Invalid private reading revision.');
                }
                if (($current === null && !$revisions->matchesAbsence($expectedRevision, $grant, time()))
                    || ($current !== null && (!$revisions->isStored($expectedRevision)
                        || !hash_equals($current->revision, $expectedRevision)))) {
                    return 'reading_position_changed';
                }
                // No state is created/updated before this live authority check.
                if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                    return 'access_denied';
                }
                // A slow authority response must not extend an absence ticket.
                if ($current === null && !$revisions->matchesAbsence($expectedRevision, $grant, time())) {
                    return 'reading_position_changed';
                }
                $revision = $revisions->next();
                $savedAt = now()->utc()->format('Y-m-d\TH:i:s\Z');
                $values = ['educational_lesson_id' => $lessonId, 'revision' => $revision, 'saved_at' => $savedAt];
                if ($current === null) {
                    $inserted = DB::table('educational_reading_positions')->insertOrIgnore([
                        'educational_organization_id' => $org, 'subject_key' => $grant->subjectId,
                        ...$values,
                    ]);
                    if ($inserted !== 1) {
                        // A competing first write wins the unique private key.
                        // Do not treat an unrelated ignored constraint as success.
                        if ((clone $slot)->exists()) {
                            return 'reading_position_changed';
                        }
                        throw new \UnexpectedValueException('Reading position insertion failed.');
                    }
                    // A different course can contend for the same previously
                    // absent private key after our pre-write check. INSERT may
                    // wait for that transaction and proceed if it rolls back.
                    // Recheck after the wait; throwing is essential to roll back
                    // this insertion rather than commit a failure receipt.
                    if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                        throw new ReadingPositionWriteRejected('access_denied');
                    }
                    if (!$revisions->matchesAbsence($expectedRevision, $grant, time())) {
                        throw new ReadingPositionWriteRejected('reading_position_changed');
                    }
                } elseif ((clone $slot)->where('revision', $expectedRevision)->update($values) !== 1) {
                    return 'reading_position_changed';
                }

                return $this->readingPositionEnvelope('available', $revision, [
                    'course_id' => $courseId, 'course_version' => $courseVersion,
                    'lesson_id' => $lessonId, 'saved_at' => $savedAt,
                ]);
            });
        } catch (ReadingPositionWriteRejected $rejected) {
            return $rejected->reasonCode;
        }
    }

    /** @return array<string, mixed>|string */
    public function clearReadingPosition(
        PortalGrant $grant,
        string $expectedRevision,
        ReadingPositionRevision $revisions,
        ?callable $verifyFreshGrant = null,
    ): array|string {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return 'access_denied';
        }
        $org = $this->orgId($grant);
        if ($org === null) {
            return 'temporarily_unavailable';
        }
        if (!$revisions->isStored($expectedRevision)) {
            return 'reading_position_changed';
        }

        return DB::transaction(function () use ($grant, $org, $expectedRevision, $revisions, $verifyFreshGrant): array|string {
            // Clearing needs no content access or course lock. It never waits
            // for a course after holding this private slot, avoiding inversion.
            $slot = DB::table('educational_reading_positions')
                ->where('educational_organization_id', $org)->where('subject_key', $grant->subjectId);
            $current = (clone $slot)->lockForUpdate()->first(['revision']);
            if ($current === null || !is_string($current->revision)
                || !hash_equals($current->revision, $expectedRevision)) {
                return 'reading_position_changed';
            }
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                return 'access_denied';
            }
            $revision = $revisions->next();
            if ((clone $slot)->where('revision', $expectedRevision)->update([
                'educational_lesson_id' => null, 'saved_at' => null, 'revision' => $revision,
            ]) !== 1) {
                return 'reading_position_changed';
            }

            return $this->readingPositionEnvelope('none', $revision);
        });
    }

    public function favoriteCourse(PortalGrant $grant, int $courseId, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }
        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return false;
        }

        return DB::transaction(function () use ($grant, $courseId, $org, $editorialOrg, $verifyFreshGrant): bool {
            // Serialize with publication in the same order: course, version.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $editorialOrg)
                ->where('is_shared', true)->where('is_published', true)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return false;
            }
            $version = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->where('status', 'published')
                ->lockForUpdate()->first(['id']);
            if ($version === null) {
                return false;
            }

            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                return false;
            }

            $now = now();
            $inserted = DB::table('educational_course_favorites')->insertOrIgnore([
                'educational_organization_id' => $org,
                'subject_key' => $grant->subjectId,
                'educational_course_id' => $courseId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            if ($inserted === 1) {
                return true;
            }

            // A duplicate is success only when this exact private row exists.
            return DB::table('educational_course_favorites')
                ->where('educational_organization_id', $org)
                ->where('subject_key', $grant->subjectId)
                ->where('educational_course_id', $courseId)->exists();
        });
    }

    public function unfavoriteCourse(PortalGrant $grant, int $courseId, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $courseId, $org, $verifyFreshGrant): bool {
            $favorite = DB::table('educational_course_favorites')
                ->where('educational_organization_id', $org)
                ->where('subject_key', $grant->subjectId)
                ->where('educational_course_id', $courseId);

            // An absent preference is already removed. Do not inspect or lock
            // another student's course merely to report the same receipt.
            if (!$favorite->exists()) {
                return $this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant);
            }

            // Only the student's existing preference authorizes this lookup.
            // The course may have been withdrawn: read no editorial content.
            $course = DB::table('educational_courses')->where('id', $courseId)
                ->lockForUpdate()->first(['id']);
            if ($course === null
                || !$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                return false;
            }

            $favorite->delete();
            return true;
        });
    }

    /**
     * Private read-only lesson search for current eligible clients.
     * No external AI, user query storage, per-user search history or client IDs.
     * All search hits originate ONLY from the live published editorial version.
     *
     * @return list<array{course_id:int,course_title:string,lesson_id:int,lesson_title:string,snippet:string}>|null
     */
    public function searchPublishedLessons(PortalGrant $grant, string $query): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }

        $normalized = $this->normalizedSearchQuery($query);
        if ($normalized === null) {
            return null;
        }

        $rows = $this->publishedLessonSearchQuery($editorialOrg, $normalized)
            ->orderBy('c.sort_order')->orderBy('c.id')
            ->orderBy('l.sort_order')->orderBy('l.id')
            ->limit(9)
            ->get(['l.id as lesson_id', 'l.title as lesson_title',
                'l.body', 'c.id as course_id', 'c.title as course_title'])
            ->all();

        // Controller also rechecks the actual Portal authority before output.
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }
        return $this->publishedLessonSearchResults(array_slice($rows, 0, 8), $normalized);
    }

    private function normalizedSearchQuery(string $query): ?string
    {
        $normalized = trim(preg_replace('/\s+/u', ' ', $query) ?? '');
        // A bounded literal phrase; SQL wildcards and controls are not a language.
        return preg_match('/\A[\p{L}\p{N} -]{3,60}\z/u', $normalized) === 1 ? $normalized : null;
    }

    private function publishedLessonSearchQuery(int $editorialOrg, string $normalized): Builder
    {
        $pattern = '%'.mb_strtolower($normalized, 'UTF-8').'%';
        return DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->where('l.is_published', true)
            ->where(function ($builder) use ($pattern): void {
                $builder->whereRaw('LOWER(l.title) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(l.body) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(c.title) LIKE ?', [$pattern]);
            });
    }

    /** @param list<stdClass> $rows */
    private function publishedLessonSearchResults(array $rows, string $normalized): array
    {
        $results = [];
        foreach ($rows as $row) {
            $body = trim(preg_replace('/\s+/u', ' ', (string) $row->body) ?? '');
            $start = mb_stripos($body, $normalized, 0, 'UTF-8');
            $offset = $start === false ? 0 : max(0, $start - 40);
            $snippet = mb_substr($body, $offset, 150, 'UTF-8');
            if ($offset > 0) {
                $snippet = '…'.$snippet;
            }
            if ($offset + 150 < mb_strlen($body, 'UTF-8')) {
                $snippet .= '…';
            }
            $results[] = [
                'course_id' => (int) $row->course_id,
                'course_title' => (string) $row->course_title,
                'lesson_id' => (int) $row->lesson_id,
                'lesson_title' => (string) $row->lesson_title,
                'snippet' => $snippet,
            ];
        }
        return $results;
    }

    /** @return array<string, int> */
    private function publishedSearchAnchor(stdClass $row): array
    {
        $anchor = [];
        foreach (['course_sort_order', 'course_id', 'course_version_id', 'course_version',
            'lesson_sort_order', 'lesson_id'] as $field) {
            $anchor[$field] = $this->editorialOrderInteger(
                $row->{$field}, str_ends_with($field, '_sort_order') ? 0 : 1, 9007199254740991,
            );
        }
        return $anchor;
    }

    /** @param array<string, int> $expected */
    private function publishedSearchAnchorMatches(Builder $query, array $expected): bool
    {
        $row = (clone $query)->where('l.id', $expected['lesson_id'])->first([
            'c.sort_order as course_sort_order', 'c.id as course_id',
            'v.id as course_version_id', 'v.version as course_version',
            'l.sort_order as lesson_sort_order', 'l.id as lesson_id',
        ]);
        return $row !== null && $this->publishedSearchAnchor($row) === $expected;
    }

    /**
     * Manual continuation of the same live search, never a frozen catalog.
     * No token grants access: publication, query and actual Portal authority
     * must still match on every request. Legacy first-page callers stay above.
     *
     * @return array<string, mixed>|string A page or a fixed generic error.
     */
    public function searchPublishedLessonsPage(PortalGrant $grant, string $query, ?string $cursor = null): array|string
    {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)
            || $grant->companyId === self::EDITORIAL_ORGANIZATION_KEY) {
            return 'access_denied';
        }
        $normalized = $this->normalizedSearchQuery($query);
        if ($normalized === null) {
            return 'invalid_query';
        }
        $codec = new PublishedLessonSearchCursor();
        $anchor = $cursor === null ? null : $codec->decode($cursor, $normalized);
        if ($cursor !== null && $anchor === null) {
            return 'invalid_cursor';
        }
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return 'temporarily_unavailable';
        }
        $base = $this->publishedLessonSearchQuery($editorialOrg, $normalized);
        if ($anchor !== null && !$this->publishedSearchAnchorMatches($base, $anchor)) {
            return 'search_context_changed';
        }
        $page = clone $base;
        if ($anchor !== null) {
            // Each component is bound. BIGINT casts avoid PostgreSQL int4
            // overflow even for an authenticated, safe but outlying bound.
            $page->where(function (Builder $after) use ($anchor): void {
                $after->whereRaw('c.sort_order > CAST(? AS BIGINT)', [$anchor['course_sort_order']])
                    ->orWhere(function (Builder $sameOrder) use ($anchor): void {
                        $sameOrder->whereRaw('c.sort_order = CAST(? AS BIGINT)', [$anchor['course_sort_order']])
                            ->where('c.id', '>', $anchor['course_id']);
                    })->orWhere(function (Builder $sameCourse) use ($anchor): void {
                        $sameCourse->whereRaw('c.sort_order = CAST(? AS BIGINT)', [$anchor['course_sort_order']])
                            ->where('c.id', $anchor['course_id'])
                            ->whereRaw('l.sort_order > CAST(? AS BIGINT)', [$anchor['lesson_sort_order']]);
                    })->orWhere(function (Builder $sameLessonOrder) use ($anchor): void {
                        $sameLessonOrder->whereRaw('c.sort_order = CAST(? AS BIGINT)', [$anchor['course_sort_order']])
                            ->where('c.id', $anchor['course_id'])
                            ->whereRaw('l.sort_order = CAST(? AS BIGINT)', [$anchor['lesson_sort_order']])
                            ->where('l.id', '>', $anchor['lesson_id']);
                    });
            });
        }
        $rows = $page->orderBy('c.sort_order')->orderBy('c.id')
            ->orderBy('l.sort_order')->orderBy('l.id')->limit(9)->get([
                'l.id as lesson_id', 'l.title as lesson_title', 'l.body',
                'c.id as course_id', 'c.title as course_title',
                'c.sort_order as course_sort_order', 'v.id as course_version_id',
                'v.version as course_version', 'l.sort_order as lesson_sort_order',
            ])->all();
        // Detect a withdrawal/reorder that happened while this page was read.
        // Other catalog changes can still affect live subsequent pages.
        if ($anchor !== null && !$this->publishedSearchAnchorMatches($base, $anchor)) {
            return 'search_context_changed';
        }
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return 'access_denied';
        }
        $anchors = [];
        foreach ($rows as $row) {
            // Validate the sentinel as well: no rounded identifiers in a cursor.
            $anchors[] = $this->publishedSearchAnchor($row);
        }
        return [
            'schema_version' => 1,
            'scope' => 'current_published_editorial_lessons',
            'results' => $this->publishedLessonSearchResults(array_slice($rows, 0, 8), $normalized),
            'next_cursor' => count($rows) > 8 ? $codec->encode($normalized, $anchors[7]) : null,
        ];
    }

    public function lesson(PortalGrant $grant, int $lessonId): ?stdClass
    {
        $org = $this->orgId($grant);
        if ($org === null || $lessonId < 1) {
            return null;
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return null;
        }

        $lesson = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('l.id', $lessonId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->where('l.is_published', true)
            ->select('l.id', 'l.slug', 'l.title', 'l.body', 'l.sort_order', 'c.id as course_id',
                'v.version as course_version')
            ->first();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $lesson : null;
    }

    /**
     * Aulas da versão publicada com o estado do aluno/empresa autenticados.
     * Não retorna IDs de progresso ou dados de outros alunos.
     *
     * @return array<int, stdClass>
     */
    public function lessons(PortalGrant $grant, int $courseId): array
    {
        $org = $this->orgId($grant);
        if ($org === null || $courseId < 1) {
            return [];
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return [];
        }

        $lessons = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->leftJoin('educational_lesson_progress as p', function ($join) use ($org, $grant): void {
                $join->on('p.educational_lesson_id', '=', 'l.id')
                    ->where('p.educational_organization_id', '=', $org)
                    ->where('p.subject_key', '=', $grant->subjectId);
            })
            ->where('c.id', $courseId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->where('l.is_published', true)
            ->orderBy('l.sort_order')->orderBy('l.id')
            ->select('l.id', 'l.slug', 'l.title', 'l.sort_order')
            ->selectRaw('CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS completed')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $lessons : [];
    }

    /**
     * Leitura privada e limitada do histórico do aluno autenticado.
     * Inclui versões arquivadas para que a retirada de um curso do ar não
     * destrua seu histórico, mas nunca inclui dados de outra empresa/aluno.
     * Null = indisponível/negação conservadora, não substitui Portal SSO.
     *
     * @return array{schema_version:int,scope:string,completions:list<array<string,int|string>>}|null
     */
    public function exportProgress(PortalGrant $grant): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }

        $entries = DB::table('educational_lesson_progress as p')
            ->join('educational_lessons as l', 'l.id', '=', 'p.educational_lesson_id')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('p.educational_organization_id', $org)
            ->where('p.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->whereIn('v.status', ['published', 'archived'])
            ->orderBy('p.id')
            ->limit(5001)
            ->get(['c.slug as course_slug', 'v.version as course_version',
                'l.slug as lesson_slug', 'p.completed_at'])
            ->all();

        // Nunca exportar parcialmente como se fosse um histórico completo.
        if (count($entries) > 5000 || !$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }

        return [
            'schema_version' => 1,
            'scope' => 'current_authenticated_student',
            'completions' => array_map(
                fn (stdClass $item): array => [
                    'course_slug' => (string) $item->course_slug,
                    'course_version' => (int) $item->course_version,
                    'lesson_slug' => (string) $item->lesson_slug,
                    // PDO PostgreSQL may use a short offset such as +00.
                    // Share the private-reference UTC format; a bad stored
                    // value must abort the complete export, never invent a date.
                    'completed_at' => $this->privateReferenceTimestamp($item->completed_at),
                ],
                $entries,
            ),
        ];
    }

    private function progressHistoryInteger(mixed $value): int
    {
        if ((!is_int($value) && !is_string($value))
            || preg_match('/\A[1-9][0-9]{0,15}\z/D', (string) $value) !== 1
            || filter_var($value, FILTER_VALIDATE_INT, ['options' => [
                'min_range' => 1, 'max_range' => 9007199254740991,
            ]]) === false) {
            throw new \UnexpectedValueException('Invalid private completion identifier.');
        }
        return (int) $value;
    }

    /**
     * The same retained references as exportProgress, one bounded page at a
     * time. Record order is p.id DESC, not a new ranking or a timestamp cursor.
     * Availability belongs to the exact completed lesson and version.
     *
     * @return array<string, mixed>|string A fixed error code, never a partial page.
     */
    public function progressHistory(PortalGrant $grant, ?int $beforeId = null): array|string
    {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)
            || $grant->companyId === self::EDITORIAL_ORGANIZATION_KEY) {
            return 'access_denied';
        }
        if ($beforeId !== null && ($beforeId < 1 || $beforeId > 9007199254740991)) {
            return 'invalid_cursor';
        }
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return 'temporarily_unavailable';
        }
        $query = DB::table('educational_lesson_progress as p')
            ->join('educational_lessons as l', 'l.id', '=', 'p.educational_lesson_id')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('p.educational_organization_id', $org)
            ->where('p.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->whereIn('v.status', ['published', 'archived']);
        if ($beforeId !== null) {
            // A bound is not an ownership claim. Do not look up an anchor:
            // foreign or removed IDs only restrict this already-private query.
            $query->where('p.id', '<', $beforeId);
        }
        $rows = $query->orderByDesc('p.id')->limit(51)
            ->get(['p.id as completion_id', 'c.slug as course_slug', 'v.version as course_version',
                'l.slug as lesson_slug', 'p.completed_at',
                DB::raw("CASE WHEN c.is_published AND v.status = 'published' AND l.is_published THEN 'available' ELSE 'unavailable' END AS availability"),
            ])->all();
        $completions = [];
        $previousId = $beforeId;
        foreach ($rows as $row) {
            $id = $this->progressHistoryInteger($row->completion_id);
            $version = $this->progressHistoryInteger($row->course_version);
            foreach ([$row->course_slug, $row->lesson_slug] as $slug) {
                if (!is_string($slug) || strlen($slug) > 120
                    || preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $slug) !== 1) {
                    throw new \UnexpectedValueException('Invalid private completion reference.');
                }
            }
            if (($previousId !== null && $id >= $previousId)
                || !in_array($row->availability, ['available', 'unavailable'], true)) {
                throw new \UnexpectedValueException('Invalid private completion ordering or availability.');
            }
            $completions[] = ['completion_id' => $id, 'course_slug' => $row->course_slug,
                'course_version' => $version, 'lesson_slug' => $row->lesson_slug,
                'completed_at' => $this->privateReferenceTimestamp($row->completed_at),
                'availability' => $row->availability];
            $previousId = $id;
        }
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return 'access_denied';
        }
        // The sentinel is validated too; do not hide a broken continuation.
        $hasNext = count($completions) > 50;
        $completions = array_slice($completions, 0, 50);
        return ['schema_version' => 1, 'scope' => 'current_authenticated_student',
            'completions' => $completions,
            'next_before_id' => $hasNext ? $completions[49]['completion_id'] : null];
    }

    public function isComplete(PortalGrant $grant, int $lessonId): ?bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $this->lesson($grant, $lessonId) === null) {
            return null;
        }

        $completed = DB::table('educational_lesson_progress')
            ->where('educational_organization_id', $org)
            ->where('subject_key', $grant->subjectId)
            ->where('educational_lesson_id', $lessonId)
            ->exists();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $completed : null;
    }

    public function complete(PortalGrant $grant, int $lessonId, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return false;
        }

        return DB::transaction(function () use ($grant, $lessonId, $org, $editorialOrg, $verifyFreshGrant): bool {
            // Descobrir o curso sem confiar em course_id enviado pelo navegador.
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $editorialOrg)
                ->where('c.is_shared', true)
                ->value('c.id');

            if ($courseId === null) {
                return false;
            }

            // Mesma ordem de lock da publicação: primeiro curso, depois aula.
            // Impede concluir aulas enquanto o editor arquiva/publica versões.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $editorialOrg)
                ->where('is_shared', true)
                ->where('is_published', true)
                ->lockForUpdate()
                ->first(['id']);

            if ($course === null) {
                return false;
            }

            // Validar novamente a versão e a aula sob bloqueio do curso.
            $lesson = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $editorialOrg)
                ->where('c.is_shared', true)
                ->where('c.is_published', true)
                ->where('v.status', 'published')
                ->where('l.is_published', true)
                ->first(['l.id']);

            if ($lesson === null) {
                return false;
            }

            // Curso/aula já foram verificados sob lock. Confirmar novamente
            // revogação, identidade e revisão antes do primeiro INSERT.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::VIEW, $verifyFreshGrant)) {
                return false;
            }

            $now = now();
            // A restrição UNIQUE permite repetição idempotente.
            // Só declarar sucesso depois de confirmar que existe o
            // registro EXATO deste aluno, nesta empresa e nesta aula.
            $inserted = DB::table('educational_lesson_progress')->insertOrIgnore([
                'educational_organization_id' => $org,
                'subject_key' => $grant->subjectId,
                'educational_lesson_id' => $lessonId,
                'completed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($inserted === 1) {
                return true;
            }

            // insertOrIgnore também pode retornar 0 por conflitos que não
            // sejam a duplicidade esperada. Nunca produzir sucesso fictício.
            return DB::table('educational_lesson_progress')
                ->where('educational_organization_id', $org)
                ->where('subject_key', $grant->subjectId)
                ->where('educational_lesson_id', $lessonId)
                ->exists();
        });
    }

    /**
     * Registro atômico junto à mutação editorial.
     * Não registrar conteúdo, IP, tokens de Portal, segredo ou dados de cobrança.
     */
    private function audit(
        PortalGrant $grant,
        int $editorialOrg,
        string $action,
        string $kind,
        int $resourceId,
    ): void {
        if (
            !$this->grantUsable($grant, PortalAccessGate::MANAGE) ||
            $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY
        ) {
            throw new \LogicException('Auditoria exige identidade editorial válida.');
        }

        DB::table('educational_audit_events')->insert([
            'educational_organization_id' => $editorialOrg,
            'actor_key' => $grant->subjectId,
            'action' => $action,
            'resource_kind' => $kind,
            'resource_id' => $resourceId,
            'authority_revision' => $grant->revision,
            'occurred_at' => now(),
        ]);
    }

    /** @return array<int, stdClass> */
    /**
     * Bounded read-only editorial history scoped to the authorized operator.
     * Actor identifier is intentionally never included in the HTTP response.
     *
     * @return array{events:array<int,stdClass>,next_before_id:int|null}
     */
    public function adminAudit(PortalGrant $grant, ?int $beforeId = null): array
    {
        $empty = ['events' => [], 'next_before_id' => null];
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return $empty;
        }

        $query = DB::table('educational_audit_events')
            ->where('educational_organization_id', $org);
        if ($beforeId !== null) {
            $query->where('id', '<', $beforeId);
        }
        $rows = $query->orderByDesc('id')->limit(51)
            ->get(['id', 'action', 'resource_kind', 'resource_id',
                'authority_revision', 'occurred_at'])->all();

        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)) {
            return $empty;
        }

        $more = count($rows) > 50;
        $events = array_slice($rows, 0, 50);
        return [
            'events' => $events,
            'next_before_id' => $more && $events !== []
                ? (int) $events[count($events) - 1]->id
                : null,
        ];
    }

    /**
     * Advisory editorial readiness. This hash is only a concurrency fence,
     * never proof of human review, active services or Portal authorization.
     */
    private function publicationHash(stdClass $course, stdClass $version, iterable $lessons): string
    {
        $rows = [];
        foreach ($lessons as $lesson) {
            $rows[] = [
                (int) $lesson->id, (string) $lesson->slug,
                (string) $lesson->title, (string) $lesson->body,
                (int) $lesson->sort_order,
            ];
        }
        return hash('sha256', json_encode([
            (int) $course->id, (string) $course->slug,
            (string) $course->title, (string) $course->category,
            (string) ($course->summary ?? ''), (int) $course->sort_order,
            (string) ($course->audience ?? ''), (string) ($course->suggested_knowledge ?? ''),
            (int) $version->id, (int) $version->version, $rows,
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    /** @return array<string, mixed>|null */
    public function publicationPreflight(PortalGrant $grant, int $courseId): ?array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return null;
        }
        $course = DB::table('educational_courses')
            ->where('id', $courseId)
            ->where('educational_organization_id', $org)
            ->where('is_shared', true)
            ->first(['id', 'slug', 'title', 'category', 'summary', 'sort_order',
                'audience', 'suggested_knowledge', 'is_published']);
        if ($course === null) {
            return null;
        }
        $version = DB::table('educational_course_versions')
            ->where('educational_course_id', $courseId)
            ->orderByDesc('version')
            ->first(['id', 'version', 'status']);
        if ($version === null) {
            return null;
        }
        $lessons = DB::table('educational_lessons')
            ->where('educational_course_version_id', $version->id)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'slug', 'title', 'body', 'sort_order']);

        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)) {
            return null;
        }

        $issues = [];
        if ($course->is_published || $version->status !== 'draft') {
            $issues[] = 'not_draft';
        }
        if ($lessons->isEmpty()) {
            $issues[] = 'missing_lessons';
        }
        foreach ($lessons as $lesson) {
            if (trim((string) $lesson->title) === '' || trim((string) $lesson->body) === '') {
                $issues[] = 'invalid_lesson';
                break;
            }
        }
        $warnings = trim((string) ($course->summary ?? '')) === ''
            ? ['missing_optional_summary'] : [];

        return [
            'course_id' => $courseId,
            'version' => (int) $version->version,
            'lesson_count' => $lessons->count(),
            'ready' => $issues === [],
            'issues' => $issues,
            'warnings' => $warnings,
            'content_hash' => $this->publicationHash($course, $version, $lessons),
            'advisory_only' => true,
        ];
    }

    public function adminCourses(PortalGrant $grant): array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return [];
        }

        $courses = DB::table('educational_courses')
            ->where('educational_organization_id', $org)
            ->where('is_shared', true)
            ->orderBy('sort_order')->orderBy('id')
            ->select('id', 'slug', 'title', 'summary', 'category', 'sort_order',
                'audience', 'suggested_knowledge', 'is_published')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? $courses : [];
    }

    private function archivedCourseError(PortalGrant $grant, int $courseId): ?string
    {
        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)
            || $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY) {
            return 'access_denied';
        }
        if ($courseId < 1 || $courseId > 9007199254740991) {
            return 'not_found';
        }
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return 'temporarily_unavailable';
        }
        // No historical lookup for a course outside the current editorial scope.
        return DB::table('educational_courses')->where('id', $courseId)
            ->where('educational_organization_id', $org)->where('is_shared', true)->exists()
            ? null : 'not_found';
    }

    private function archivedInteger(mixed $value, int $minimum = 0): int
    {
        if ((!is_int($value) && !is_string($value))
            || (is_string($value) && preg_match('/\A(?:0|[1-9][0-9]*)\z/D', $value) !== 1)) {
            throw new \UnexpectedValueException('Invalid editorial archive integer.');
        }
        $integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => [
            'min_range' => $minimum, 'max_range' => 9007199254740991,
        ]]);
        if ($integer === false) {
            throw new \UnexpectedValueException('Invalid editorial archive integer.');
        }
        return $integer;
    }

    private function archivedText(mixed $value, int $maximum): string
    {
        if (!is_string($value) || preg_match('//u', $value) !== 1 || trim($value) === ''
            || mb_strlen($value, 'UTF-8') > $maximum) {
            throw new \UnexpectedValueException('Invalid editorial archive text.');
        }
        return $value;
    }

    /** @return array<string, int|string> */
    private function archivedLessonFields(stdClass $row, bool $withBody): array
    {
        $slug = $this->archivedText($row->slug, 120);
        if (preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $slug) !== 1) {
            throw new \UnexpectedValueException('Invalid editorial archive slug.');
        }
        $lesson = ['id' => $this->archivedInteger($row->id, 1), 'slug' => $slug,
            'title' => $this->archivedText($row->title, 200)];
        if ($withBody) {
            $lesson['body'] = $this->archivedText($row->body, 30000);
        }
        $lesson['sort_order'] = $this->archivedInteger($row->sort_order);
        return $lesson;
    }

    /**
     * Archived version numbers only. Course title/summary/category are global
     * current metadata and are deliberately absent from historical envelopes.
     *
     * @return array<string, mixed>|string
     */
    public function archivedVersions(PortalGrant $grant, int $courseId, ?int $beforeVersion = null): array|string
    {
        $error = $this->archivedCourseError($grant, $courseId);
        if ($error !== null) {
            return $error;
        }
        $query = DB::table('educational_course_versions as v')
            ->where('v.educational_course_id', $courseId)->where('v.status', 'archived');
        if ($beforeVersion !== null) {
            if ($beforeVersion < 1 || $beforeVersion > 9007199254740991
                // Bind as bigint so a safe JS integer beyond PostgreSQL int4
                // yields an absent anchor rather than a parameter overflow.
                || !(clone $query)->whereRaw('v.version = CAST(? AS BIGINT)', [$beforeVersion])->exists()) {
                return 'invalid_cursor';
            }
            $query->where('v.version', '<', $beforeVersion);
        }
        // Correlated count uses the version index and the same SQL snapshot;
        // it never sums current or other-version lessons into an archived one.
        $count = DB::table('educational_lessons as l')->selectRaw('COUNT(*)')
            ->whereColumn('l.educational_course_version_id', 'v.id');
        $rows = $query->orderByDesc('v.version')->limit(51)->select('v.version', 'v.status')
            ->selectSub($count, 'lesson_count')->get()->all();
        $versions = [];
        foreach ($rows as $row) {
            if ($row->status !== 'archived') {
                throw new \UnexpectedValueException('Invalid editorial archive status.');
            }
            $versions[] = ['version' => $this->archivedInteger($row->version, 1),
                'status' => 'archived', 'lesson_count' => $this->archivedInteger($row->lesson_count)];
        }
        $more = count($versions) > 50;
        $versions = array_slice($versions, 0, 50);
        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? [
            'schema_version' => 1, 'scope' => 'editorial_archived_content', 'course_id' => $courseId,
            'versions' => $versions,
            'next_before_version' => $more ? $versions[count($versions) - 1]['version'] : null,
        ] : 'access_denied';
    }

    /** @return array<string, mixed>|string */
    public function archivedLessons(PortalGrant $grant, int $courseId, int $courseVersion,
        ?int $afterSortOrder = null, ?int $afterLessonId = null): array|string
    {
        $error = $this->archivedCourseError($grant, $courseId);
        if ($error !== null) {
            return $error;
        }
        if ($courseVersion < 1 || $courseVersion > 9007199254740991) {
            return 'not_found';
        }
        $version = DB::table('educational_course_versions')->where('educational_course_id', $courseId)
            ->whereRaw('version = CAST(? AS BIGINT)', [$courseVersion])->where('status', 'archived')->value('id');
        if ($version === null) {
            return 'not_found';
        }
        $query = DB::table('educational_lessons')->where('educational_course_version_id', $version);
        if (($afterSortOrder === null) !== ($afterLessonId === null)) {
            return 'invalid_cursor';
        }
        if ($afterSortOrder !== null) {
            if ($afterSortOrder < 0 || $afterSortOrder > 9007199254740991
                || $afterLessonId < 1 || $afterLessonId > 9007199254740991
                || !(clone $query)->whereRaw('sort_order = CAST(? AS BIGINT)', [$afterSortOrder])
                    ->where('id', $afterLessonId)->exists()) {
                return 'invalid_cursor';
            }
            $query->where(static function ($after) use ($afterSortOrder, $afterLessonId): void {
                $after->where('sort_order', '>', $afterSortOrder)->orWhere(static function ($tie) use ($afterSortOrder, $afterLessonId): void {
                    $tie->where('sort_order', $afterSortOrder)->where('id', '>', $afterLessonId);
                });
            });
        }
        $rows = $query->orderBy('sort_order')->orderBy('id')->limit(51)
            ->get(['id', 'slug', 'title', 'sort_order'])->all();
        $lessons = array_map(fn (stdClass $row): array => $this->archivedLessonFields($row, false), $rows);
        $more = count($lessons) > 50;
        $lessons = array_slice($lessons, 0, 50);
        $last = $more ? $lessons[count($lessons) - 1] : null;
        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? [
            'schema_version' => 1, 'scope' => 'editorial_archived_content', 'course_id' => $courseId,
            'course_version' => $courseVersion, 'status' => 'archived', 'lessons' => $lessons,
            'next_after' => $last === null ? null : ['sort_order' => $last['sort_order'], 'lesson_id' => $last['id']],
        ] : 'access_denied';
    }

    /** @return array<string, mixed>|string */
    public function archivedLesson(PortalGrant $grant, int $courseId, int $courseVersion, int $lessonId): array|string
    {
        $error = $this->archivedCourseError($grant, $courseId);
        if ($error !== null) {
            return $error;
        }
        if ($courseVersion < 1 || $courseVersion > 9007199254740991 || $lessonId < 1 || $lessonId > 9007199254740991) {
            return 'not_found';
        }
        $row = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->where('v.educational_course_id', $courseId)->whereRaw('v.version = CAST(? AS BIGINT)', [$courseVersion])
            ->where('v.status', 'archived')->where('l.id', $lessonId)
            ->first(['l.id', 'l.slug', 'l.title', 'l.body', 'l.sort_order']);
        if ($row === null) {
            return 'not_found';
        }
        $lesson = $this->archivedLessonFields($row, true);
        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? [
            'schema_version' => 1, 'scope' => 'editorial_archived_content', 'course_id' => $courseId,
            'course_version' => $courseVersion, 'status' => 'archived', 'lesson' => $lesson,
        ] : 'access_denied';
    }

    /**
     * Read-only editorial aggregates. Each course uses the highest version
     * number, matching adminLessons; historical versions are never added up.
     * No student identity, preference, progress or tutor table is consulted.
     *
     * @return array{schema_version:int,scope:string,totals:array<string,int>,categories:list<array<string,int|string>>}|null
     */
    public function adminOverview(PortalGrant $grant): ?array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return null;
        }

        $latestVersions = DB::table('educational_course_versions as v')
            ->join('educational_courses as owned', 'owned.id', '=', 'v.educational_course_id')
            ->where('owned.educational_organization_id', $org)->where('owned.is_shared', true)
            ->select('v.educational_course_id')->selectRaw('MAX(v.version) as latest_version')
            ->groupBy('v.educational_course_id');
        $lessonCounts = DB::table('educational_course_versions as v')
            ->joinSub($latestVersions, 'latest', static function (\Illuminate\Database\Query\JoinClause $join): void {
                $join->on('latest.educational_course_id', '=', 'v.educational_course_id')
                    ->on('latest.latest_version', '=', 'v.version');
            })
            ->leftJoin('educational_lessons as l', 'l.educational_course_version_id', '=', 'v.id')
            ->select('v.educational_course_id')->selectRaw('COUNT(l.id) as lesson_count')
            ->groupBy('v.educational_course_id');

        // One SQL statement provides all category/total inputs from one DB
        // snapshot. COALESCE also covers a course without any version yet.
        $rows = DB::table('educational_courses as c')
            ->leftJoinSub($lessonCounts, 'current_lessons', 'current_lessons.educational_course_id', '=', 'c.id')
            ->where('c.educational_organization_id', $org)->where('c.is_shared', true)
            ->groupBy('c.category')->select('c.category')
            ->selectRaw('COUNT(*) as courses')
            ->selectRaw('SUM(CASE WHEN c.is_published THEN 1 ELSE 0 END) as published_courses')
            ->selectRaw('SUM(CASE WHEN c.is_published THEN 0 ELSE 1 END) as draft_courses')
            ->selectRaw('SUM(COALESCE(current_lessons.lesson_count, 0)) as current_lessons')
            ->selectRaw('SUM(CASE WHEN COALESCE(current_lessons.lesson_count, 0) = 0 THEN 1 ELSE 0 END) as courses_without_lessons')
            ->selectRaw("SUM(CASE WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(c.summary, ''), ?, ''), ?, ''), ?, ''), ?, '')) = '' THEN 1 ELSE 0 END) as courses_without_summary",
                ["\t", "\n", "\r", "\v"])
            ->get()->all();

        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)) {
            return null;
        }

        $totals = ['courses' => 0, 'published_courses' => 0, 'draft_courses' => 0,
            'current_lessons' => 0, 'courses_without_lessons' => 0, 'courses_without_summary' => 0];
        $categories = [];
        foreach (['metodologia', 'negocios', 'sistemas'] as $category) {
            $categories[$category] = ['category' => $category, 'courses' => 0,
                'published_courses' => 0, 'draft_courses' => 0, 'current_lessons' => 0];
        }
        $seen = [];
        foreach ($rows as $row) {
            if (!is_string($row->category) || !isset($categories[$row->category]) || isset($seen[$row->category])) {
                return null;
            }
            $seen[$row->category] = true;
            $counts = [];
            foreach (array_keys($totals) as $field) {
                $raw = $row->{$field} ?? null;
                // PostgreSQL SUM may use a decimal integer string; neither
                // floats, negatives nor values unsafe for the browser are valid.
                if (!(is_int($raw) || (is_string($raw) && preg_match('/\A(?:0|[1-9][0-9]{0,15})\z/D', $raw) === 1))
                    || (int) $raw < 0 || (int) $raw > 9007199254740991) {
                    return null;
                }
                $counts[$field] = (int) $raw;
            }
            if ($counts['published_courses'] > $counts['courses']
                || $counts['draft_courses'] !== $counts['courses'] - $counts['published_courses']
                || $counts['courses_without_lessons'] > $counts['courses']
                || $counts['courses_without_summary'] > $counts['courses']) {
                return null;
            }
            foreach ($counts as $field => $count) {
                if ($count > 9007199254740991 - $totals[$field]) {
                    return null;
                }
                $totals[$field] += $count;
                if (array_key_exists($field, $categories[$row->category])) {
                    $categories[$row->category][$field] = $count;
                }
            }
        }

        return ['schema_version' => 1, 'scope' => 'current_editorial_catalog',
            'totals' => $totals, 'categories' => array_values($categories)];
    }

    public function adminLessons(PortalGrant $grant, int $courseId): array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return [];
        }

        // Mesmo na administração, nunca consultar uma versão de outro tenant.
        $course = DB::table('educational_courses')
            ->where('id', $courseId)
            ->where('educational_organization_id', $org)
            ->where('is_shared', true)
            ->first(['id']);
        if ($course === null) {
            return [];
        }

        $versionId = DB::table('educational_course_versions')
            ->where('educational_course_id', $courseId)
            ->orderByDesc('version')
            ->value('id');
        if ($versionId === null) {
            return [];
        }

        $lessons = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->where('v.id', $versionId)
            ->orderBy('l.sort_order')->orderBy('l.id')
            ->select('l.id', 'l.slug', 'l.title', 'l.body', 'l.sort_order', 'l.is_published', 'v.status')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? $lessons : [];
    }

    /** @param array{slug:string,title:string,category:string,summary?:string|null,audience?:string|null,suggested_knowledge?:string|null,sort_order?:int} $input */
    public function createCourse(PortalGrant $grant, array $input, ?callable $verifyFreshGrant = null): ?int
    {
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return null;
        }

        return DB::transaction(function () use ($grant, $org, $input, $verifyFreshGrant): ?int {
            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return null;
            }

            $now = now();
            $id = DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org,
                'is_shared' => true,
                'slug' => $input['slug'],
                'title' => $input['title'],
                'category' => $input['category'],
                'summary' => $input['summary'] ?? null,
                'audience' => $input['audience'] ?? null,
                'suggested_knowledge' => $input['suggested_knowledge'] ?? null,
                'sort_order' => $input['sort_order'] ?? 0,
                'is_published' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('educational_course_versions')->insert([
                'educational_course_id' => $id,
                'version' => 1,
                'status' => 'draft',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($grant, $org, 'course.created', 'course', (int) $id);
            return (int) $id;
        });
    }

    /**
     * @param array{title:string,summary?:string|null,category:string,audience?:string|null,suggested_knowledge?:string|null,sort_order?:int,expected_sort_order?:int} $input
     * @throws EditorialCourseOrderConflict Only for a well-formed stale order precondition.
     */
    public function updateCourse(PortalGrant $grant, int $courseId, array $input, ?callable $verifyFreshGrant = null): bool
    {
        $guardedOrder = array_key_exists('expected_sort_order', $input);
        if ($guardedOrder && (!is_int($input['expected_sort_order'])
            || $input['expected_sort_order'] < 0 || $input['expected_sort_order'] > 9999
            || !array_key_exists('sort_order', $input) || !is_int($input['sort_order'])
            || $input['sort_order'] < 0 || $input['sort_order'] > 9999)) {
            // Direct domain callers must not silently drop a malformed guard.
            return false;
        }
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $input, $guardedOrder, $verifyFreshGrant): bool {
            // Lock igual ao utilizado por publish/unpublish e operações de aula:
            // a verificação de rascunho e a edição devem ser atômicas.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id', 'sort_order']);

            if ($course === null) {
                return false;
            }

            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return false;
            }

            // Publish, unpublish and editorial edits serialize on this row.
            // Compare its current order only after the lock and live grant.
            if ($guardedOrder && $input['expected_sort_order'] !==
                $this->editorialOrderInteger($course->sort_order, 0, 9999)) {
                throw new EditorialCourseOrderConflict('The draft course order changed.');
            }
            $changes = [
                'title' => $input['title'],
                'summary' => $input['summary'] ?? null,
                'category' => $input['category'],
                'updated_at' => now(),
            ];
            // Older clients omit these optional fields. Preserve the stored
            // guidance unless an editor explicitly replaces or clears it.
            foreach (['audience', 'suggested_knowledge'] as $field) {
                if (array_key_exists($field, $input)) {
                    $changes[$field] = $input[$field];
                }
            }
            // An omitted PATCH field does not reset the locked course's order.
            // Creation keeps its zero default; explicit legacy values apply.
            if (array_key_exists('sort_order', $input)) {
                $changes['sort_order'] = $input['sort_order'];
            }
            $changed = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->update($changes) > 0;

            if ($changed) {
                $this->audit($grant, $org, 'course.updated', 'course', $courseId);
            }

            return $changed;
        });
    }

    /** @param array{slug:string,title:string,body:string,sort_order?:int} $input */
    public function addLesson(PortalGrant $grant, int $courseId, array $input, ?callable $verifyFreshGrant = null): ?int
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return null;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $input, $verifyFreshGrant): ?int {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return null;
            }

            $version = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->where('status', 'draft')
                ->orderByDesc('version')->first(['id']);
            if ($version === null) {
                return null;
            }

            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return null;
            }

            $now = now();
            $lessonId = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version->id,
                'slug' => $input['slug'],
                'title' => $input['title'],
                'body' => $input['body'],
                'sort_order' => $input['sort_order'] ?? 0,
                'is_published' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($grant, $org, 'lesson.created', 'lesson', $lessonId);
            return $lessonId;
        });
    }

    /**
     * @param array{title:string,body:string,sort_order?:int,expected_sort_order?:int} $input
     * @throws EditorialLessonOrderConflict Only for a well-formed stale order precondition.
     */
    public function updateLesson(PortalGrant $grant, int $lessonId, array $input, ?callable $verifyFreshGrant = null): bool
    {
        $guardedOrder = array_key_exists('expected_sort_order', $input);
        if ($guardedOrder && (!is_int($input['expected_sort_order'])
            || $input['expected_sort_order'] < 0 || $input['expected_sort_order'] > 9999
            || !array_key_exists('sort_order', $input) || !is_int($input['sort_order'])
            || $input['sort_order'] < 0 || $input['sort_order'] > 9999)) {
            // Direct domain callers must not silently drop a malformed guard.
            return false;
        }
        $org = $this->adminOrgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $lessonId, $input, $guardedOrder, $verifyFreshGrant): bool {
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->value('c.id');
            if ($courseId === null) {
                return false;
            }

            // Mesma ordem do publish/unpublish: trava curso antes da aula.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return false;
            }

            $row = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->where('c.is_published', false)
                ->where('v.status', 'draft')
                ->select('l.id', 'l.sort_order')->first();
            if ($row === null) {
                return false;
            }

            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return false;
            }

            // All editorial writers serialize on the course above. Compare
            // the current row only after that lock and the live grant check.
            if ($guardedOrder && $input['expected_sort_order'] !==
                $this->editorialOrderInteger($row->sort_order, 0, 9999)) {
                throw new EditorialLessonOrderConflict('The draft lesson order changed.');
            }
            $changes = [
                'title' => $input['title'],
                'body' => $input['body'],
                'updated_at' => now(),
            ];
            // PATCH omission preserves the locked row's order. Creation keeps
            // its existing zero default; explicit legacy values still apply.
            if (array_key_exists('sort_order', $input)) {
                $changes['sort_order'] = $input['sort_order'];
            }
            $changed = DB::table('educational_lessons')->where('id', $row->id)->update($changes) > 0;
            if ($changed) {
                $this->audit($grant, $org, 'lesson.updated', 'lesson', $lessonId);
            }
            return $changed;
        });
    }

    /** @return array{expected:array<int,array{id:int,sort_order:int}>,target:array<int,array{id:int,sort_order:int}>}|null */
    private function lessonReorderPlan(int $lessonId, string $direction, array $expectedOrder): ?array
    {
        if ($lessonId < 1 || $lessonId > 9007199254740991
            || !in_array($direction, ['up', 'down'], true)
            || !array_is_list($expectedOrder) || count($expectedOrder) < 1 || count($expectedOrder) > 10000) {
            return null;
        }
        $ids = [];
        $expected = [];
        $position = null;
        $previous = null;
        foreach ($expectedOrder as $index => $row) {
            if (!is_array($row) || count($row) !== 2 || !array_key_exists('id', $row)
                || !array_key_exists('sort_order', $row) || !is_int($row['id'])
                || $row['id'] < 1 || $row['id'] > 9007199254740991 || isset($ids[$row['id']])
                || !is_int($row['sort_order']) || $row['sort_order'] < 0 || $row['sort_order'] > 9999
                || ($previous !== null && ($row['sort_order'] < $previous['sort_order']
                    || ($row['sort_order'] === $previous['sort_order'] && $row['id'] <= $previous['id'])))) {
                return null;
            }
            $ids[$row['id']] = true;
            $previous = ['id' => $row['id'], 'sort_order' => $row['sort_order']];
            $expected[] = $previous;
            if ($row['id'] === $lessonId) {
                $position = $index;
            }
        }
        if ($position === null) {
            return null;
        }
        $neighbor = $position + ($direction === 'up' ? -1 : 1);
        if ($neighbor < 0 || $neighbor >= count($expected)) {
            // A boundary no-op preserves even non-contiguous numeric orders.
            return ['expected' => $expected, 'target' => $expected];
        }
        $target = $expected;
        [$target[$position], $target[$neighbor]] = [$target[$neighbor], $target[$position]];
        foreach ($target as $index => &$row) {
            $row['sort_order'] = $index;
        }
        unset($row);
        return ['expected' => $expected, 'target' => $target];
    }

    private function editorialOrderInteger(mixed $value, int $minimum, int $maximum): int
    {
        if ((!is_int($value) && !is_string($value))
            || (is_string($value) && preg_match('/\A(?:0|[1-9][0-9]*)\z/D', $value) !== 1)) {
            throw new \UnexpectedValueException('Invalid editorial order integer.');
        }
        $integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => [
            'min_range' => $minimum, 'max_range' => $maximum,
        ]]);
        if ($integer === false) {
            throw new \UnexpectedValueException('Invalid editorial order integer.');
        }
        return $integer;
    }

    /**
     * One explicit adjacent move against a complete canonical snapshot.
     * The destination is derived from that snapshot, never from a later order.
     * No-op and duplicate intentions do not update timestamps or write audits.
     *
     * @param array<int,array{id:int,sort_order:int}> $expectedOrder
     * @return array<string,mixed>|string Receipt or a fixed error code.
     */
    public function reorderDraftLessons(
        PortalGrant $grant,
        int $courseId,
        int $lessonId,
        string $direction,
        array $expectedOrder,
        ?callable $verifyFreshGrant = null,
    ): array|string {
        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)
            || $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY) {
            return 'access_denied';
        }
        if ($courseId < 1 || $courseId > 9007199254740991) {
            return 'not_found';
        }
        $plan = $this->lessonReorderPlan($lessonId, $direction, $expectedOrder);
        if ($plan === null) {
            return 'invalid_order';
        }
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return 'temporarily_unavailable';
        }

        try {
            return DB::transaction(function () use ($grant, $org, $courseId, $lessonId, $direction,
                $plan, $verifyFreshGrant): array|string {
                // Every existing editorial write first locks this same course.
                $course = DB::table('educational_courses')->where('id', $courseId)
                    ->where('educational_organization_id', $org)->where('is_shared', true)
                    ->lockForUpdate()->first(['id', 'is_published']);
                if ($course === null) {
                    return 'not_found';
                }
                if (!in_array($course->is_published, [false, 0, '0'], true)) {
                    return 'draft_order_changed';
                }
                $version = DB::table('educational_course_versions')->where('educational_course_id', $courseId)
                    ->orderByDesc('version')->lockForUpdate()->first(['id', 'version', 'status']);
                if ($version === null || $version->status !== 'draft') {
                    return 'draft_order_changed';
                }
                $versionId = $this->editorialOrderInteger($version->id, 1, 9007199254740991);
                $versionNumber = $this->editorialOrderInteger($version->version, 1, 9007199254740991);
                // Sentinel rejects the whole operation, never a partial order.
                // ID lock order stays stable while display order is compared in memory.
                $rows = DB::table('educational_lessons')->where('educational_course_version_id', $versionId)
                    ->orderBy('id')->limit(10001)->lockForUpdate()->get(['id', 'sort_order', 'is_published']);
                if ($rows->count() > 10000) {
                    return 'order_limit_exceeded';
                }
                $current = [];
                foreach ($rows as $row) {
                    if (!in_array($row->is_published, [false, 0, '0'], true)) {
                        return 'draft_order_changed';
                    }
                    $current[] = [
                        'id' => $this->editorialOrderInteger($row->id, 1, 9007199254740991),
                        'sort_order' => $this->editorialOrderInteger($row->sort_order, 0, 9999),
                    ];
                }
                usort($current, static fn (array $a, array $b): int =>
                    ($a['sort_order'] <=> $b['sort_order']) ?: ($a['id'] <=> $b['id']));
                if ($current !== $plan['expected'] && $current !== $plan['target']) {
                    return 'draft_order_changed';
                }
                // Also reauthorize no-ops; they still return protected metadata.
                if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                    return 'access_denied';
                }
                $changed = $current !== $plan['target'];
                if ($changed) {
                    $oldOrders = array_column($current, 'sort_order', 'id');
                    $updates = array_values(array_filter($plan['target'], static fn (array $row): bool =>
                        $oldOrders[$row['id']] !== $row['sort_order']));
                    $now = now();
                    // At most 40 parameterized UPDATEs for the 10,000-row capacity.
                    // Each chunk remains inside this one transaction and all locks.
                    foreach (array_chunk($updates, 256) as $chunk) {
                        $cases = [];
                        $bindings = [];
                        foreach ($chunk as $row) {
                            $cases[] = 'WHEN ? THEN CAST(? AS INTEGER)';
                            $bindings[] = $row['id'];
                            $bindings[] = $row['sort_order'];
                        }
                        $bindings[] = $now;
                        $bindings[] = $versionId;
                        foreach ($chunk as $row) {
                            $bindings[] = $row['id'];
                        }
                        $sql = 'UPDATE educational_lessons SET sort_order = CASE id '.implode(' ', $cases)
                            .' ELSE sort_order END, updated_at = ? WHERE educational_course_version_id = ?'
                            .' AND is_published = FALSE AND id IN ('.implode(',', array_fill(0, count($chunk), '?')).')';
                        if (DB::update($sql, $bindings) !== count($chunk)) {
                            throw new \UnexpectedValueException('Editorial order update was incomplete.');
                        }
                    }
                    $this->audit($grant, $org, 'course.lessons_reordered', 'course', $courseId);
                    // A denial after any chunk/audit MUST throw inside the transaction.
                    if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                        throw new EditorialOrderWriteRejected('Editorial order authority changed.');
                    }
                }
                return [
                    'schema_version' => 1, 'scope' => 'current_editorial_draft',
                    'course_id' => $courseId, 'course_version' => $versionNumber, 'status' => 'draft',
                    'lesson_id' => $lessonId, 'direction' => $direction, 'changed' => $changed,
                    'order' => $plan['target'],
                ];
            });
        } catch (EditorialOrderWriteRejected) {
            return 'access_denied';
        }
    }

    /**
     * Exclui somente aula de rascunho editorial ainda não publicada e sem
     * progresso. Mantém versões publicadas/arquivadas e histórico intactos.
     */
    public function deleteDraftLesson(PortalGrant $grant, int $lessonId, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $lessonId, $verifyFreshGrant): bool {
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->value('c.id');

            if ($courseId === null) {
                return false;
            }

            // Mesma ordem de lock da publicação: curso antes da aula.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id']);

            if ($course === null) {
                return false;
            }

            $lesson = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->where('c.is_published', false)
                ->where('v.status', 'draft')
                ->where('l.is_published', false)
                ->first(['l.id']);

            if ($lesson === null) {
                return false;
            }

            // Mesmo diante de dados legados inconsistentes, preservar
            // conclusões existentes e recusar exclusão em cascata.
            if (DB::table('educational_lesson_progress')
                ->where('educational_lesson_id', $lessonId)->exists()) {
                return false;
            }

            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return false;
            }

            $deleted = DB::table('educational_lessons')
                ->where('id', $lessonId)
                ->where('is_published', false)
                ->delete() === 1;

            if ($deleted) {
                $this->audit($grant, $org, 'lesson.deleted', 'lesson', $lessonId);
            }

            return $deleted;
        });
    }

    /**
     * Deleta APENAS um curso que jamais foi publicado: exatamente uma versão
     * draft, sem aulas publicadas, versões históricas nem progresso registrado.
     * A ordem das exclusões respeita as FKs RESTRICT e a auditoria é atômica.
     */
    public function deleteNeverPublishedCourse(PortalGrant $grant, int $courseId, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $verifyFreshGrant): bool {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id']);
            if ($course === null) {
                return false;
            }

            $versions = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id', 'status']);

            // A single draft version is required. Prior publication leaves
            // archived versions and blocks deletion forever.
            if ($versions->count() !== 1 || $versions[0]->status !== 'draft') {
                return false;
            }
            $versionId = (int) $versions[0]->id;

            $lessonIds = DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->pluck('id')->all();

            if (DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->where('is_published', true)->exists()) {
                return false;
            }

            if ($lessonIds !== [] && DB::table('educational_lesson_progress')
                ->whereIn('educational_lesson_id', $lessonIds)->exists()) {
                return false;
            }

            // If foreign key constraints or concurrent writes disagree,
            // the transaction throws and rolls back everything.
            // Recheck expiry after locks and reads, before first mutation.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return false;
            }

            $deletedLessons = DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->where('is_published', false)->delete();
            if ($deletedLessons !== count($lessonIds)) {
                throw new \RuntimeException('Draft course changed during deletion.');
            }

            $deletedVersion = DB::table('educational_course_versions')
                ->where('id', $versionId)
                ->where('status', 'draft')->delete();
            if ($deletedVersion !== 1) {
                throw new \RuntimeException('Draft course version changed during deletion.');
            }

            $deletedCourse = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)->delete();
            if ($deletedCourse !== 1) {
                throw new \RuntimeException('Draft course changed during deletion.');
            }

            $this->audit($grant, $org, 'course.deleted', 'course', $courseId);
            return true;
        });
    }

    public function setPublished(PortalGrant $grant, int $courseId, bool $publish, ?string $expectedContentHash = null, ?callable $verifyFreshGrant = null): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $publish, $expectedContentHash, $verifyFreshGrant): bool {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->where('is_published', !$publish)
                ->lockForUpdate()->first(['id', 'slug', 'title', 'category', 'summary', 'sort_order',
                    'audience', 'suggested_knowledge']);
            if ($course === null) {
                return false;
            }

            $version = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->where('status', $publish ? 'draft' : 'published')
                ->orderByDesc('version')
                ->lockForUpdate()->first(['id', 'version', 'status']);
            if ($version === null) {
                return false;
            }

            $lessons = DB::table('educational_lessons')
                ->where('educational_course_version_id', $version->id)
                ->orderBy('sort_order')->orderBy('id')
                ->get(['id', 'slug', 'title', 'body', 'sort_order']);

            if ($publish) {
                if ($lessons->isEmpty()) {
                    return false;
                }
                foreach ($lessons as $lesson) {
                    if (trim((string) $lesson->title) === '' || trim((string) $lesson->body) === '') {
                        return false;
                    }
                }
            }

            // Reconfirmar a autoridade após os locks de curso e versão e
            // antes de publicar ou arquivar qualquer aula.
            if (!$this->freshWriteGrantMatches($grant, PortalAccessGate::MANAGE, $verifyFreshGrant)) {
                return false;
            }

            // Compare the exact course/version/lesson snapshot under lock.
            if ($publish && $expectedContentHash !== null &&
                !hash_equals(
                    $this->publicationHash($course, $version, $lessons),
                    $expectedContentHash
                )) {
                return false;
            }

            $now = now();
            if ($publish) {
                DB::table('educational_lessons')
                    ->where('educational_course_version_id', $version->id)
                    ->update(['is_published' => true, 'updated_at' => $now]);
                DB::table('educational_course_versions')
                    ->where('id', $version->id)
                    ->update(['status' => 'published', 'updated_at' => $now]);
            } else {
                // Retirar do ar imediatamente. Versão publicada torna-se
                // imutável: os progressos permanecem vinculados a aulas antigas.
                DB::table('educational_lessons')
                    ->where('educational_course_version_id', $version->id)
                    ->update(['is_published' => false, 'updated_at' => $now]);
                DB::table('educational_course_versions')
                    ->where('id', $version->id)
                    ->update(['status' => 'archived', 'updated_at' => $now]);

                $draftId = DB::table('educational_course_versions')->insertGetId([
                    'educational_course_id' => $courseId,
                    'version' => (int) $version->version + 1,
                    'status' => 'draft',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                // Novos IDs preservam o histórico das aulas antigas.
                foreach ($lessons as $lesson) {
                    DB::table('educational_lessons')->insert([
                        'educational_course_version_id' => $draftId,
                        'slug' => $lesson->slug,
                        'title' => $lesson->title,
                        'body' => $lesson->body,
                        'sort_order' => $lesson->sort_order,
                        'is_published' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }

            DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->update(['is_published' => $publish, 'updated_at' => $now]);

            $this->audit(
                $grant,
                $org,
                $publish ? 'course.published' : 'course.unpublished',
                'course',
                $courseId
            );
            return true;
        });
    }

}
