<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use App\Domain\Tutor\TutorGateway;
use App\Domain\Tutor\TutorQuestion;
use App\Domain\Learning\UniversityCatalogRepository;
use App\Domain\Learning\UniversityTenantProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            if (!is_string($credential) || !is_string($company)) {
                return null;
            }

            $latest = $gate->authorize($credential, $company, $expected->permission, time());
            if (!$latest->allowed
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
    public function initialize(Request $request, UniversityTenantProvisioner $provisioner): JsonResponse
    {
        try {
            $ready = $provisioner->initialize($this->grant($request), time());
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

    public function lessons(Request $request, int $courseId): JsonResponse
    {
        return response()->json(['lessons' => $this->catalog->lessons($this->grant($request), $courseId)]);
    }

    public function lesson(Request $request, int $lessonId): JsonResponse
    {
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
        int $lessonId,
        TutorGateway $gateway,
        PortalAccessGate $gate,
    ): JsonResponse {
        $grant = $this->grant($request);
        $data = $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $lesson = $this->catalog->lesson($grant, $lessonId);
        if ($lesson === null) {
            return response()->json(['error' => 'not_found'], 404);
        }

        try {
            $reply = $gateway->explain(new TutorQuestion(
                (string) $data['question'],
                (string) $lesson->slug,
                (int) $lesson->course_version,
                (string) $lesson->body,
            ));
        } catch (\Throwable) {
            return response()->json(['error' => 'tutor_unavailable'], 503);
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

        if (trim($reply->message) === '' || strlen($reply->message) > 12000) {
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

    public function progress(Request $request, int $lessonId): JsonResponse
    {
        $completed = $this->catalog->isComplete($this->grant($request), $lessonId);
        return $completed === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['completed' => $completed]);
    }

    public function complete(Request $request, int $lessonId, PortalAccessGate $gate): JsonResponse
    {
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
            'before_id' => ['sometimes', 'integer', 'min:1', 'max:2147483647'],
        ]);
        return response()->json($this->catalog->adminAudit(
            $this->grant($request),
            isset($input['before_id']) ? (int) $input['before_id'] : null,
        ));
    }

    public function publicationPreflight(Request $request, int $courseId): JsonResponse
    {
        $result = $this->catalog->publicationPreflight($this->grant($request), $courseId);
        return $result === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json($result);
    }

    public function adminCourses(Request $request): JsonResponse
    {
        return response()->json(['courses' => $this->catalog->adminCourses($this->grant($request))]);
    }

    public function adminLessons(Request $request, int $courseId): JsonResponse
    {
        return response()->json(['lessons' => $this->catalog->adminLessons($this->grant($request), $courseId)]);
    }

    public function createCourse(Request $request): JsonResponse
    {
        $input = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'regex:/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/'],
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', 'in:metodologia,negocios,sistemas'],
            'summary' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);
        try {
            $id = $this->catalog->createCourse($this->grant($request), $input);
        } catch (QueryException) {
            return response()->json(['error' => 'conflict_or_unavailable'], 409);
        }

        return $id === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['id' => $id, 'status' => 'draft'], 201);
    }

    public function updateCourse(Request $request, int $courseId): JsonResponse
    {
        $input = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', 'in:metodologia,negocios,sistemas'],
            'summary' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return $this->catalog->updateCourse($this->grant($request), $courseId, $input)
            ? response()->json(['saved' => true])
            : response()->json(['error' => 'not_found_or_published'], 404);
    }

    public function createLesson(Request $request, int $courseId): JsonResponse
    {
        $input = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'regex:/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/'],
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'body' => ['required', 'string', 'min:10', 'max:30000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        try {
            $id = $this->catalog->addLesson($this->grant($request), $courseId, $input);
        } catch (QueryException) {
            return response()->json(['error' => 'conflict_or_unavailable'], 409);
        }
        return $id === null
            ? response()->json(['error' => 'not_found_or_published'], 404)
            : response()->json(['id' => $id, 'status' => 'draft'], 201);
    }

    public function updateLesson(Request $request, int $lessonId): JsonResponse
    {
        $input = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'body' => ['required', 'string', 'min:10', 'max:30000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return $this->catalog->updateLesson($this->grant($request), $lessonId, $input)
            ? response()->json(['saved' => true])
            : response()->json(['error' => 'not_found_or_published'], 404);
    }

    public function deleteDraftLesson(Request $request, int $lessonId): JsonResponse
    {
        return $this->catalog->deleteDraftLesson($this->grant($request), $lessonId)
            ? response()->json(['deleted' => true])
            : response()->json(['error' => 'not_found_or_protected'], 404);
    }

    public function deleteNeverPublishedCourse(Request $request, int $courseId): JsonResponse
    {
        try {
            $deleted = $this->catalog->deleteNeverPublishedCourse($this->grant($request), $courseId);
        } catch (QueryException) {
            return response()->json(['error' => 'protected_or_conflict'], 409);
        }
        return $deleted
            ? response()->json(['deleted' => true])
            : response()->json(['error' => 'not_found_or_protected'], 404);
    }

    public function publish(Request $request, int $courseId, PortalAccessGate $gate): JsonResponse
    {
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

    public function unpublish(Request $request, int $courseId, PortalAccessGate $gate): JsonResponse
    {
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
