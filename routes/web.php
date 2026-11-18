<?php

declare(strict_types=1);

use App\Http\Controllers\UniversityController;
use Illuminate\Support\Facades\Route;

/**
 * C-03: rotas privadas para implementação futura. SEM SSO, o provider
 * UnavailablePortalAuthority nega TODAS as requisições (403).
 * Grupo web Laravel inclui sessão e CSRF em escritas.
 */
Route::prefix('universidade/private')->group(function (): void {
    Route::middleware('university.grant:view')->group(function (): void {
        Route::view('/app', 'university.student');
        Route::post('/initialize', [UniversityController::class, 'initialize']);
        Route::get('/courses', [UniversityController::class, 'courses']);
        Route::get('/favorites', [UniversityController::class, 'favorites']);
        Route::get('/favorites/export', [UniversityController::class, 'exportFavorites']);
        Route::get('/favorites/retained', [UniversityController::class, 'retainedFavorites']);
        Route::get('/reading-position', [UniversityController::class, 'readingPosition']);
        Route::get('/reading-position/export', [UniversityController::class, 'exportReadingPosition']);
        Route::put('/reading-position', [UniversityController::class, 'saveReadingPosition']);
        Route::delete('/reading-position', [UniversityController::class, 'clearReadingPosition']);
        Route::put('/courses/{courseId}/favorite', [UniversityController::class, 'favoriteCourse'])
            ->whereNumber('courseId');
        Route::delete('/courses/{courseId}/favorite', [UniversityController::class, 'unfavoriteCourse'])
            ->whereNumber('courseId');
        Route::post('/search', [UniversityController::class, 'searchLessons'])
            ->middleware('throttle:20,1');
        Route::get('/progress/export', [UniversityController::class, 'exportProgress']);
        Route::get('/courses/{courseId}/lessons', [UniversityController::class, 'lessons'])
            ->whereNumber('courseId');
        Route::get('/lessons/{lessonId}', [UniversityController::class, 'lesson'])
            ->whereNumber('lessonId');
        Route::post('/lessons/{lessonId}/tutor', [UniversityController::class, 'askTutor'])
            ->whereNumber('lessonId');
        Route::get('/lessons/{lessonId}/progress', [UniversityController::class, 'progress'])
            ->whereNumber('lessonId');
        Route::post('/lessons/{lessonId}/complete', [UniversityController::class, 'complete'])
            ->whereNumber('lessonId');
    });

    Route::middleware('university.grant:manage')->prefix('admin')->group(function (): void {
        Route::view('/app', 'university.admin');
        Route::get('/courses', [UniversityController::class, 'adminCourses']);
        Route::get('/courses/{courseId}/versions', [UniversityController::class, 'archivedVersions'])
            ->whereNumber('courseId');
        Route::get('/courses/{courseId}/versions/{courseVersion}/lessons', [UniversityController::class, 'archivedLessons'])
            ->whereNumber('courseId')->whereNumber('courseVersion');
        Route::get('/courses/{courseId}/versions/{courseVersion}/lessons/{lessonId}', [UniversityController::class, 'archivedLesson'])
            ->whereNumber('courseId')->whereNumber('courseVersion')->whereNumber('lessonId');
        Route::get('/overview', [UniversityController::class, 'adminOverview']);
        Route::get('/audit', [UniversityController::class, 'adminAudit']);
        Route::post('/courses', [UniversityController::class, 'createCourse']);
        Route::patch('/courses/{courseId}', [UniversityController::class, 'updateCourse'])
            ->whereNumber('courseId');
        Route::delete('/courses/{courseId}', [UniversityController::class, 'deleteNeverPublishedCourse'])
            ->whereNumber('courseId');
        Route::get('/courses/{courseId}/lessons', [UniversityController::class, 'adminLessons'])
            ->whereNumber('courseId');
        Route::get('/courses/{courseId}/publication-check', [UniversityController::class, 'publicationPreflight'])
            ->whereNumber('courseId');
        Route::post('/courses/{courseId}/lessons', [UniversityController::class, 'createLesson'])
            ->whereNumber('courseId');
        Route::patch('/lessons/{lessonId}', [UniversityController::class, 'updateLesson'])
            ->whereNumber('lessonId');
        Route::delete('/lessons/{lessonId}', [UniversityController::class, 'deleteDraftLesson'])
            ->whereNumber('lessonId');
        Route::post('/courses/{courseId}/publish', [UniversityController::class, 'publish'])
            ->whereNumber('courseId');
        Route::post('/courses/{courseId}/unpublish', [UniversityController::class, 'unpublish'])
            ->whereNumber('courseId');
    });
});

Route::fallback(static function () {
    return response()->json(['error' => 'not_found'], 404);
});
