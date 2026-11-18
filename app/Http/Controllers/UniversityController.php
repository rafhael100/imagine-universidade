<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use App\Domain\Tutor\TutorGateway;
use App\Domain\Tutor\TutorQuestion;
use App\Domain\Learning\UniversityCatalogRepository;
use App\Domain\Learning\UniversityTenantProvisioner;
use App\Domain\Learning\ReadingPositionRevision;
use App\Domain\Learning\EditorialLessonOrderConflict;
use App\Domain\Learning\EditorialCourseOrderConflict;
use App\Domain\Learning\PublishedLessonSearchCursor;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * C-03: API privada SEM SSO operacional. Todas as rotas exigem
 * RequireUniversityGrant; binding atual do Portal sempre nega.
 */
final class UniversityController
{
    public function __construct(private readonly UniversityCatalogRepository $catalog)
    {
    }

    private function grant(Request $request): PortalGrant
    {
        $grant = $request->attributes->get('university.verified_grant');
        if (!$grant instanceof PortalGrant || !$grant->allowed) {
            throw new HttpException(403, 'access_denied');
        }

        return $grant;
    }

    /**
     * Preserve legacy decimal route aliases, including zero and leading zeros.
     * Check the PHP integer boundary as text before casting; the newer archived
     * routes deliberately have a separate positive/safe-integer contract.
     */
    private function legacyRouteIdentifier(string $value): ?int
    {
        if (preg_match('/\A[0-9]+\z/D', $value) !== 1) {
            return null;
        }
        $normalized = ltrim($value, '0');
        if ($normalized === '') {
            return 0;
        }
        $maximum = (string) PHP_INT_MAX;
        if (strlen($normalized) > strlen($maximum)
            || (strlen($normalized) === strlen($maximum) && strcmp($normalized, $maximum) > 0)) {
            return null;
        }

        return (int) $normalized;
    }

    /**
     * Never release protected data after a slow DB/model operation unless
     * the live Portal decision still matches the original subject, tenant,
     * permission and revision. Neither signatures nor cached sessions replace
     * the authority's current state.
     */
    private function freshGrant(
        Request $request,
        PortalAccessGate $gate,
        PortalGrant $expected,
    ): ?PortalGrant {
        try {
            $credential = $request->session()->get('portal_server_credential');
            $company = $request->session()->get('portal_company_id');
            $boundDigest = $request->attributes->get('university.initial_credential_digest');
            if (!is_string($credential) || !is_string($company)
                || !is_string($boundDigest)
                || strlen($boundDigest) !== 64
                || !hash_equals($boundDigest, hash('sha256', $credential))
                || $company !== $expected->companyId) {
                return null;
            }

            $latest = $gate->authorize($credential, $company, $expected->permission, time());
            // A session may change while the live Portal lookup waits.
            // Check the server-held values again before this grant can be
            // used in a transaction or a read of private references.
            if ($request->session()->get('portal_server_credential') !== $credential
                || $request->session()->get('portal_company_id') !== $company
                || !$latest->allowed
                || $latest->companyId !== $expected->companyId
                || $latest->subjectId !== $expected->subjectId
                || $latest->revision !== $expected->revision
                || $latest->permission !== $expected->permission) {
                return null;
            }

            return $latest;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Só funciona após grant VIEW proveniente de sessão servidor do Portal.
     * Não recebe company_id nem subject_id do corpo da requisição.
     */
    public function initialize(Request $request, UniversityTenantProvisioner $provisioner, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $ready = $provisioner->initialize(
                $grant,
                time(),
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        return $ready
            ? response()->json(['ready' => true])
            : response()->json(['error' => 'access_denied'], 403);
    }

    public function courses(Request $request): JsonResponse
    {
        return response()->json(['courses' => $this->catalog->catalog($this->grant($request))]);
    }

    public function favorites(Request $request): JsonResponse
    {
        try {
            $ids = $this->catalog->favoriteCourseIds($this->grant($request));
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        // The private GET middleware revalidates Portal before releasing IDs.
        return response()->json(['course_ids' => $ids]);
    }

    public function exportFavorites(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $favorites = $this->catalog->exportFavorites($grant);
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        if ($favorites === null) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }

        return response()->json($favorites, 200, [
            'Content-Disposition' => 'attachment; filename="imagine-universidade-favoritos.json"',
        ]);
    }

    public function retainedFavorites(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        $validator = Validator::make($request->query(), [
            'after_course_id' => ['sometimes', 'required', 'integer', 'min:1', 'max:9007199254740991',
                'regex:/\A[1-9][0-9]{0,15}\z/D'],
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'invalid_cursor'], 422);
        }
        $cursor = $request->query('after_course_id');
        try {
            $favorites = $this->catalog->retainedFavorites($grant, $cursor === null ? null : (int) $cursor);
        } catch (\Throwable) {
            $favorites = 'temporarily_unavailable';
        }
        // Recheck after a successful snapshot AND after a repository failure.
        // The private GET middleware checks the decision once more at output.
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        if (is_array($favorites)) {
            return response()->json($favorites);
        }
        return match ($favorites) {
            'access_denied' => response()->json(['error' => 'access_denied'], 403),
            'invalid_cursor' => response()->json(['error' => 'invalid_cursor'], 422),
            default => response()->json(['error' => 'temporarily_unavailable'], 503),
        };
    }

    public function readingPosition(Request $request, PortalAccessGate $gate, ReadingPositionRevision $revisions): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $position = $this->catalog->readingPosition($grant, $revisions);
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($position === null) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        return response()->json($position);
    }

    public function exportReadingPosition(Request $request, PortalAccessGate $gate, ReadingPositionRevision $revisions): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $position = $this->catalog->exportReadingPosition($grant, $revisions);
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($position === null) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        return response()->json($position, 200, [
            'Content-Disposition' => 'attachment; filename="imagine-universidade-posicao-leitura.json"',
        ]);
    }

    /** @param array<string, mixed>|string $result */
    private function readingPositionWriteResponse(array|string $result): JsonResponse
    {
        if (is_array($result)) {
            return response()->json($result);
        }
        $status = match ($result) {
            'access_denied' => 403,
            'not_found' => 404,
            'reading_position_changed' => 409,
            default => 503,
        };
        return response()->json(['error' => $status === 503 ? 'temporarily_unavailable' : $result], $status);
    }

    public function saveReadingPosition(Request $request, PortalAccessGate $gate, ReadingPositionRevision $revisions): JsonResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'min:1', 'max:9007199254740991'],
            'course_version' => ['required', 'integer', 'min:1', 'max:9007199254740991'],
            'lesson_id' => ['required', 'integer', 'min:1', 'max:9007199254740991'],
            'expected_revision' => ['required', 'string', 'max:'.ReadingPositionRevision::MAX_LENGTH],
        ]);
        $grant = $this->grant($request);
        try {
            $result = $this->catalog->saveReadingPosition(
                $grant, (int) $data['course_id'], (int) $data['course_version'], (int) $data['lesson_id'],
                $data['expected_revision'], $revisions,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        return $this->readingPositionWriteResponse($result);
    }

    public function clearReadingPosition(Request $request, PortalAccessGate $gate, ReadingPositionRevision $revisions): JsonResponse
    {
        $data = $request->validate([
            'expected_revision' => ['required', 'string', 'max:'.ReadingPositionRevision::MAX_LENGTH],
        ]);
        $grant = $this->grant($request);
        try {
            $result = $this->catalog->clearReadingPosition(
                $grant, $data['expected_revision'], $revisions,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        return $this->readingPositionWriteResponse($result);
    }

    public function favoriteCourse(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        try {
            $saved = $this->catalog->favoriteCourse(
                $grant,
                $courseId,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        return $saved
            ? response()->json(['course_id' => $courseId, 'favorite' => true])
            : response()->json(['error' => 'not_found'], 404);
    }

    public function unfavoriteCourse(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        if ($courseId < 1) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        try {
            $removed = $this->catalog->unfavoriteCourse(
                $grant,
                $courseId,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        // Missing and already-removed favorites share the same receipt.
        // No course content or ownership is disclosed by this operation.
        return $removed
            ? response()->json(['course_id' => $courseId, 'favorite' => false])
            : response()->json(['error' => 'access_denied'], 403);
    }

    /**
     * Student search is a POST only to avoid putting study terms in URL logs.
     * It is read-only, bounded, private and always rechecks Portal afterward.
     */
    public function searchLessons(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        $data = $request->validate([
            'query' => ['required', 'string', 'min:3', 'max:60',
                'regex:/\A[\p{L}\p{N} -]{3,60}\z/u'],
        ]);
        // Read new flags before the empty-string middleware's normalization.
        // The opt-in is a JSON boolean; legacy query-only callers stay intact.
        $raw = $request->isJson() ? json_decode($request->getContent(), true) : $request->all();
        $raw = is_array($raw) ? $raw : [];
        $paginated = $raw['paginated'] ?? false;
        $cursor = $raw['cursor'] ?? null;
        $invalidCursor = (array_key_exists('paginated', $raw) && !is_bool($raw['paginated']))
            || ($cursor !== null && ($paginated !== true || !is_string($cursor) || $cursor === ''
                || strlen($cursor) > PublishedLessonSearchCursor::MAX_LENGTH
                || preg_match('/\A[\x21-\x7E]+\z/D', $cursor) !== 1));
        try {
            $results = $invalidCursor ? 'invalid_cursor' : ($paginated === true
                ? $this->catalog->searchPublishedLessonsPage($grant, (string) $data['query'], $cursor)
                : $this->catalog->searchPublishedLessons($grant, (string) $data['query']));
        } catch (\Throwable) {
            $results = 'temporarily_unavailable';
        }

        // This read uses POST to keep query terms out of URLs. GET middleware
        // does not recheck it, so denial must win after success AND any failure.
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        if (is_array($results)) {
            return response()->json($paginated === true ? $results : ['results' => $results], 200, [
                'Cache-Control' => 'private, no-store',
            ]);
        }
        return match ($results) {
            'access_denied' => response()->json(['error' => 'access_denied'], 403),
            'invalid_cursor' => response()->json(['error' => 'invalid_cursor'], 422),
            'search_context_changed' => response()->json(['error' => 'search_context_changed'], 409),
            default => response()->json(['error' => 'temporarily_unavailable'], 503),
        };
    }

    public function exportProgress(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $progress = $this->catalog->exportProgress($grant);
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        if ($progress === null) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        // A service may have been revoked while a large history was read.
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }

        return response()->json($progress, 200, [
            'Content-Disposition' => 'attachment; filename="imagine-universidade-progresso.json"',
        ]);
    }

    public function progressHistory(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        $validator = Validator::make($request->query(), [
            'before_id' => ['sometimes', 'required', 'integer', 'min:1', 'max:9007199254740991',
                'regex:/\A[1-9][0-9]{0,15}\z/D'],
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'invalid_cursor'], 422);
        }
        $cursor = $request->query('before_id');
        try {
            $history = $this->catalog->progressHistory($grant, $cursor === null ? null : (int) $cursor);
        } catch (\Throwable) {
            $history = 'temporarily_unavailable';
        }
        // Check authority after a successful read AND a repository failure.
        // GET middleware will check the same identity again before output.
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        if (is_array($history)) {
            return response()->json($history);
        }
        return match ($history) {
            'access_denied' => response()->json(['error' => 'access_denied'], 403),
            'invalid_cursor' => response()->json(['error' => 'invalid_cursor'], 422),
            default => response()->json(['error' => 'temporarily_unavailable'], 503),
        };
    }

    public function lessons(Request $request, string $courseId): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        return response()->json(['lessons' => $this->catalog->lessons($this->grant($request), $courseId)]);
    }

    public function lesson(Request $request, string $lessonId): JsonResponse
    {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $lesson = $this->catalog->lesson($this->grant($request), $lessonId);
        return $lesson === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['lesson' => $lesson]);
    }

    /**
     * Candidate read-only educational tutor API.
     * The default gateway ALWAYS returns unavailable. No model/egress enabled.
     */
    public function askTutor(
        Request $request,
        string $lessonId,
        TutorGateway $gateway,
        PortalAccessGate $gate,
    ): JsonResponse {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $data = $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $lesson = $this->catalog->lesson($grant, $lessonId);
        if ($lesson === null) {
            return response()->json(['error' => 'not_found'], 404);
        }

        $reply = null;
        try {
            $reply = $gateway->explain(new TutorQuestion(
                (string) $data['question'],
                (string) $lesson->slug,
                (int) $lesson->course_version,
                (string) $lesson->body,
            ));
        } catch (\Throwable) {
            // Even an unavailable gateway must pass the live access/source
            // checks below. The UI may offer already displayed lesson text
            // after a 503; revoked access must instead receive a 403.
        }

        // A slow tutor response must satisfy the same live authority fence
        // as a potentially slow history export.
        $latest = $this->freshGrant($request, $gate, $grant);
        if ($latest === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }

        // The course could be unpublished or the lesson revised while a
        // model was working. Never release text from a stale source.
        try {
            $freshLesson = $this->catalog->lesson($latest, $lessonId);
            if ($freshLesson === null
                || (string) $freshLesson->slug !== (string) $lesson->slug
                || (int) $freshLesson->course_version !== (int) $lesson->course_version
                || (string) $freshLesson->body !== (string) $lesson->body) {
                return response()->json(['error' => 'access_denied'], 403);
            }
        } catch (\Throwable) {
            return response()->json(['error' => 'access_denied'], 403);
        }

        if ($reply === null || trim($reply->message) === '' || strlen($reply->message) > 12000) {
            return response()->json(['error' => 'tutor_unavailable'], 503);
        }

        return response()->json([
            'reply' => $reply->message,
            'source' => [
                'lesson_slug' => (string) $lesson->slug,
                'course_version' => (int) $lesson->course_version,
            ],
        ]);
    }

    public function progress(Request $request, string $lessonId): JsonResponse
    {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $completed = $this->catalog->isComplete($this->grant($request), $lessonId);
        return $completed === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['completed' => $completed]);
    }

    public function complete(Request $request, string $lessonId, PortalAccessGate $gate): JsonResponse
    {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $ok = $this->catalog->complete(
            $grant,
            $lessonId,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        );

        return $ok
            ? response()->json(['completed' => true])
            : response()->json(['error' => 'not_found'], 404);
    }

    public function adminAudit(Request $request): JsonResponse
    {
        $input = $request->validate([
            'before_id' => ['sometimes', 'integer', 'min:1', 'max:9007199254740991'],
        ]);
        return response()->json($this->catalog->adminAudit(
            $this->grant($request),
            isset($input['before_id']) ? (int) $input['before_id'] : null,
        ));
    }

    public function publicationPreflight(Request $request, string $courseId): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $result = $this->catalog->publicationPreflight($this->grant($request), $courseId);
        return $result === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json($result);
    }

    public function adminCourses(Request $request): JsonResponse
    {
        return response()->json(['courses' => $this->catalog->adminCourses($this->grant($request))]);
    }

    private function archivedRouteNumber(string $value): ?int
    {
        if (preg_match('/\A[1-9][0-9]{0,15}\z/D', $value) !== 1) {
            return null;
        }
        $number = filter_var($value, FILTER_VALIDATE_INT, ['options' => [
            'min_range' => 1, 'max_range' => 9007199254740991,
        ]]);
        return $number === false ? null : $number;
    }

    /** Keep failure responses behind the same live read boundary as content. */
    private function archivedReadResponse(Request $request, PortalAccessGate $gate, callable $read): JsonResponse
    {
        $grant = $this->grant($request);
        try {
            $result = $read($grant);
        } catch (\Throwable) {
            $result = 'temporarily_unavailable';
        }
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }
        if (is_array($result)) {
            return response()->json($result);
        }
        $status = match ($result) {
            'access_denied' => 403,
            'not_found' => 404,
            'invalid_cursor' => 422,
            default => 503,
        };
        return response()->json(['error' => $status === 503 ? 'temporarily_unavailable' : $result], $status);
    }

    public function archivedVersions(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $course = $this->archivedRouteNumber($courseId);
        if ($course === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $validator = Validator::make($request->query(), [
            'before_version' => ['sometimes', 'required', 'integer', 'min:1', 'max:9007199254740991'],
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'invalid_cursor'], 422);
        }
        $input = $validator->validated();
        $before = isset($input['before_version']) ? (int) $input['before_version'] : null;
        return $this->archivedReadResponse($request, $gate,
            fn (PortalGrant $grant): array|string => $this->catalog->archivedVersions($grant, $course, $before));
    }

    public function archivedLessons(Request $request, string $courseId, string $courseVersion, PortalAccessGate $gate): JsonResponse
    {
        $course = $this->archivedRouteNumber($courseId);
        $version = $this->archivedRouteNumber($courseVersion);
        if ($course === null || $version === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $query = $request->query();
        $validator = Validator::make($query, [
            'after_sort_order' => ['sometimes', 'required', 'integer', 'min:0', 'max:9007199254740991'],
            'after_lesson_id' => ['sometimes', 'required', 'integer', 'min:1', 'max:9007199254740991'],
        ]);
        if (array_key_exists('after_sort_order', $query) !== array_key_exists('after_lesson_id', $query)
            || $validator->fails()) {
            return response()->json(['error' => 'invalid_cursor'], 422);
        }
        $input = $validator->validated();
        $afterSort = isset($input['after_sort_order']) ? (int) $input['after_sort_order'] : null;
        $afterLesson = isset($input['after_lesson_id']) ? (int) $input['after_lesson_id'] : null;
        return $this->archivedReadResponse($request, $gate,
            fn (PortalGrant $grant): array|string => $this->catalog->archivedLessons($grant, $course, $version, $afterSort, $afterLesson));
    }

    public function archivedLesson(Request $request, string $courseId, string $courseVersion,
        string $lessonId, PortalAccessGate $gate): JsonResponse
    {
        $course = $this->archivedRouteNumber($courseId);
        $version = $this->archivedRouteNumber($courseVersion);
        $lesson = $this->archivedRouteNumber($lessonId);
        if ($course === null || $version === null || $lesson === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        return $this->archivedReadResponse($request, $gate,
            fn (PortalGrant $grant): array|string => $this->catalog->archivedLesson($grant, $course, $version, $lesson));
    }

    public function adminOverview(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        if ($grant->companyId !== 'imagine-editorial') {
            return response()->json(['error' => 'access_denied'], 403);
        }
        try {
            $overview = $this->catalog->adminOverview($grant);
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($overview === null) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }
        if ($this->freshGrant($request, $gate, $grant) === null) {
            return response()->json(['error' => 'access_denied'], 403);
        }

        return response()->json($overview);
    }

    public function adminLessons(Request $request, string $courseId): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        return response()->json(['lessons' => $this->catalog->adminLessons($this->grant($request), $courseId)]);
    }

    public function createCourse(Request $request, PortalAccessGate $gate): JsonResponse
    {
        $grant = $this->grant($request);
        $input = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'regex:/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/'],
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', 'in:metodologia,negocios,sistemas'],
            'summary' => ['nullable', 'string', 'max:500'],
            'audience' => ['nullable', 'string', 'max:500'],
            'suggested_knowledge' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);
        try {
            $id = $this->catalog->createCourse(
            $grant,
            $input,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        );
        } catch (QueryException) {
            return response()->json(['error' => 'conflict_or_unavailable'], 409);
        }

        return $id === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['id' => $id, 'status' => 'draft'], 201);
    }

    public function updateCourse(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $raw = $request->all();
        if (array_key_exists('expected_sort_order', $raw)
            && (!is_int($raw['expected_sort_order']) || $raw['expected_sort_order'] < 0 || $raw['expected_sort_order'] > 9999
                || !array_key_exists('sort_order', $raw) || !is_int($raw['sort_order'])
                || $raw['sort_order'] < 0 || $raw['sort_order'] > 9999)) {
            return response()->json(['error' => 'invalid_order'], 422);
        }
        $input = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', 'in:metodologia,negocios,sistemas'],
            'summary' => ['nullable', 'string', 'max:500'],
            'audience' => ['nullable', 'string', 'max:500'],
            'suggested_knowledge' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'expected_sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        try {
            $saved = $this->catalog->updateCourse(
                $grant,
                $courseId, $input,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (EditorialCourseOrderConflict) {
            if ($this->freshGrant($request, $gate, $grant) === null) {
                return response()->json(['error' => 'access_denied'], 403);
            }
            return response()->json(['error' => 'draft_order_changed'], 409);
        }

        return $saved
            ? response()->json(['saved' => true])
            : response()->json(['error' => 'not_found_or_published'], 404);
    }

    public function createLesson(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $input = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'regex:/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/'],
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'body' => ['required', 'string', 'min:10', 'max:30000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        try {
            $id = $this->catalog->addLesson(
            $grant,
            $courseId, $input,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        );
        } catch (QueryException) {
            return response()->json(['error' => 'conflict_or_unavailable'], 409);
        }
        return $id === null
            ? response()->json(['error' => 'not_found_or_published'], 404)
            : response()->json(['id' => $id, 'status' => 'draft'], 201);
    }

    public function updateLesson(Request $request, string $lessonId, PortalAccessGate $gate): JsonResponse
    {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $raw = $request->all();
        if (array_key_exists('expected_sort_order', $raw)
            && (!is_int($raw['expected_sort_order']) || $raw['expected_sort_order'] < 0
                || $raw['expected_sort_order'] > 9999 || !array_key_exists('sort_order', $raw)
                || !is_int($raw['sort_order']) || $raw['sort_order'] < 0 || $raw['sort_order'] > 9999)) {
            return response()->json(['error' => 'invalid_order'], 422);
        }
        $input = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'body' => ['required', 'string', 'min:10', 'max:30000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'expected_sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        try {
            $saved = $this->catalog->updateLesson(
                $grant,
                $lessonId, $input,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (EditorialLessonOrderConflict) {
            // This path never committed. Do not disclose a conflict after
            // the live authority changed while the request was completing.
            if ($this->freshGrant($request, $gate, $grant) === null) {
                return response()->json(['error' => 'access_denied'], 403);
            }
            return response()->json(['error' => 'draft_order_changed'], 409);
        }
        return $saved
            ? response()->json(['saved' => true])
            : response()->json(['error' => 'not_found_or_published'], 404);
    }

    public function reorderDraftLessons(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $parsedCourseId = $this->archivedRouteNumber($courseId);
        if ($parsedCourseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        $lessonId = $request->input('lesson_id');
        $direction = $request->input('direction');
        $expectedOrder = $request->input('expected_order');
        // A bounded linear domain validator avoids quadratic wildcard/distinct
        // validation and accepts JSON integers only, not coercible strings.
        if (!is_int($lessonId) || !is_string($direction) || !is_array($expectedOrder)) {
            return response()->json(['error' => 'invalid_order'], 422);
        }
        try {
            $result = $this->catalog->reorderDraftLessons(
                $grant, $parsedCourseId, $lessonId, $direction, $expectedOrder,
                fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
            );
        } catch (\Throwable) {
            $result = 'temporarily_unavailable';
        }
        if (is_array($result)) {
            // Never recheck after commit and misreport a committed write as denied.
            return response()->json($result);
        }
        // Errors/no-commit outcomes must not outlive a changed live authority.
        if ($result !== 'access_denied' && $this->freshGrant($request, $gate, $grant) === null) {
            $result = 'access_denied';
        }
        $status = match ($result) {
            'access_denied' => 403,
            'not_found' => 404,
            'invalid_order' => 422,
            'draft_order_changed', 'order_limit_exceeded' => 409,
            default => 503,
        };
        return response()->json(['error' => $status === 503 ? 'temporarily_unavailable' : $result], $status);
    }

    public function deleteDraftLesson(Request $request, string $lessonId, PortalAccessGate $gate): JsonResponse
    {
        $lessonId = $this->legacyRouteIdentifier($lessonId);
        if ($lessonId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        return $this->catalog->deleteDraftLesson(
            $grant,
            $lessonId,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        )
            ? response()->json(['deleted' => true])
            : response()->json(['error' => 'not_found_or_protected'], 404);
    }

    public function deleteNeverPublishedCourse(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        try {
            $deleted = $this->catalog->deleteNeverPublishedCourse(
            $grant,
            $courseId,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        );
        } catch (QueryException) {
            return response()->json(['error' => 'protected_or_conflict'], 409);
        }
        return $deleted
            ? response()->json(['deleted' => true])
            : response()->json(['error' => 'not_found_or_protected'], 404);
    }

    public function publish(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $input = $request->validate([
            'expected_content_hash' => ['sometimes', 'string', 'size:64', 'regex:/\A[a-f0-9]{64}\z/'],
        ]);
        $grant = $this->grant($request);
        return $this->catalog->setPublished(
            $grant,
            $courseId,
            true,
            $input['expected_content_hash'] ?? null,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        )
            ? response()->json(['published' => true])
            : response()->json(['error' => 'missing_lesson_or_changed_draft'], 409);
    }

    public function unpublish(Request $request, string $courseId, PortalAccessGate $gate): JsonResponse
    {
        $courseId = $this->legacyRouteIdentifier($courseId);
        if ($courseId === null) {
            return response()->json(['error' => 'not_found'], 404);
        }
        $grant = $this->grant($request);
        return $this->catalog->setPublished(
            $grant,
            $courseId,
            false,
            null,
            fn (): ?PortalGrant => $this->freshGrant($request, $gate, $grant),
        )
            ? response()->json(['published' => false])
            : response()->json(['error' => 'not_found'], 404);
    }
}
