<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Access\PortalGrant;
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

    public function exportProgress(Request $request): JsonResponse
    {
        try {
            $progress = $this->catalog->exportProgress($this->grant($request));
        } catch (\Throwable) {
            return response()->json(['error' => 'temporarily_unavailable'], 503);
        }

        return $progress === null
            ? response()->json(['error' => 'temporarily_unavailable'], 503)
            : response()->json($progress, 200, [
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

    public function progress(Request $request, int $lessonId): JsonResponse
    {
        $completed = $this->catalog->isComplete($this->grant($request), $lessonId);
        return $completed === null
            ? response()->json(['error' => 'not_found'], 404)
            : response()->json(['completed' => $completed]);
    }

    public function complete(Request $request, int $lessonId): JsonResponse
    {
        $ok = $this->catalog->complete($this->grant($request), $lessonId);
        return $ok
            ? response()->json(['completed' => true])
            : response()->json(['error' => 'not_found'], 404);
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

    public function publish(Request $request, int $courseId): JsonResponse
    {
        return $this->catalog->setPublished($this->grant($request), $courseId, true)
            ? response()->json(['published' => true])
            : response()->json(['error' => 'missing_lesson_or_not_found'], 409);
    }

    public function unpublish(Request $request, int $courseId): JsonResponse
    {
        return $this->catalog->setPublished($this->grant($request), $courseId, false)
            ? response()->json(['published' => false])
            : response()->json(['error' => 'not_found'], 404);
    }
}
