<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use Illuminate\Support\Facades\DB;
use JsonException;
use RuntimeException;

/**
 * Explicit synthetic LAB importer only. Never called from HTTP and
 * impossible to run outside APP_ENV=testing.
 *
 * Prepares the approved editorial draft courses for isolated QA. Does not publish,
 * create customers, impersonate Portal grants, delete or edit existing data.
 */
final class UniversityEditorialFixtureImporter
{
    /** @return array{courses_created:int,lessons_created:int,courses_skipped:int} */
    public function import(): array
    {
        if (!app()->environment('testing')
            || !in_array(DB::getDriverName(), ['sqlite', 'pgsql'], true)) {
            throw new RuntimeException('Synthetic editorial import only in isolated test environment.');
        }

        $courses = $this->validatedCourses();

        return DB::transaction(static function () use ($courses): array {
            $now = now();
            DB::table('educational_organizations')->insertOrIgnore([
                'synthetic_key' => 'imagine-editorial',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $organizationId = DB::table('educational_organizations')
                ->where('synthetic_key', 'imagine-editorial')->value('id');

            if ($organizationId === null) {
                throw new RuntimeException('Synthetic editorial organization could not be prepared.');
            }

            $created = 0;
            $lessonsCreated = 0;
            $skipped = 0;

            foreach ($courses as $order => $course) {
                $exists = DB::table('educational_courses')
                    ->where('educational_organization_id', $organizationId)
                    ->where('slug', $course['slug'])
                    ->exists();

                if ($exists) {
                    // Never overwrite an editor's changed/published content.
                    $skipped++;
                    continue;
                }

                $courseId = DB::table('educational_courses')->insertGetId([
                    'educational_organization_id' => $organizationId,
                    'is_shared' => true,
                    'slug' => $course['slug'],
                    'title' => $course['title'],
                    'summary' => $course['summary'],
                    'category' => $course['category'],
                    'sort_order' => $order,
                    'is_published' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $versionId = DB::table('educational_course_versions')->insertGetId([
                    'educational_course_id' => $courseId,
                    'version' => 1,
                    'status' => 'draft',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($course['lessons'] as $lessonOrder => $lesson) {
                    DB::table('educational_lessons')->insert([
                        'educational_course_version_id' => $versionId,
                        'slug' => $lesson['slug'],
                        'title' => $lesson['title'],
                        'body' => $lesson['body'],
                        'sort_order' => $lessonOrder,
                        'is_published' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $lessonsCreated++;
                }

                $created++;
            }

            return [
                'courses_created' => $created,
                'lessons_created' => $lessonsCreated,
                'courses_skipped' => $skipped,
            ];
        });
    }

    /** @return list<array<string,mixed>> */
    private function validatedCourses(): array
    {
        $file = base_path('content/mvp-cursos-v1.json');
        $contents = @file_get_contents($file);
        if (!is_string($contents) || strlen($contents) > 250000) {
            throw new RuntimeException('Missing or oversized editorial manifest.');
        }

        try {
            $data = json_decode($contents, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('Invalid editorial manifest JSON.');
        }

        if (!is_array($data)
            || ($data['schema_version'] ?? null) !== 1
            || ($data['status'] ?? null) !== 'editorial_draft'
            || ($data['audience'] ?? null) !== 'authorized_imagine_clients_only'
            || !isset($data['courses'])
            || !is_array($data['courses'])
            || !array_is_list($data['courses'])
            || count($data['courses']) < 1
            || count($data['courses']) > 20) {
            throw new RuntimeException('Unapproved editorial manifest version or structure.');
        }

        $seen = [];
        foreach ($data['courses'] as $course) {
            if (!is_array($course)
                || !self::slug($course['slug'] ?? null)
                || !self::title($course['title'] ?? null)
                || !is_string($course['summary'] ?? null)
                || strlen($course['summary']) > 500
                || !in_array($course['category'] ?? null, ['metodologia', 'negocios', 'sistemas'], true)
                || !isset($course['lessons'])
                || !is_array($course['lessons'])
                || !array_is_list($course['lessons'])
                || count($course['lessons']) < 1
                || count($course['lessons']) > 50
                || isset($seen[$course['slug']])) {
                throw new RuntimeException('Invalid or duplicate course in synthetic manifest.');
            }
            $seen[$course['slug']] = true;

            $lessonSlugs = [];
            foreach ($course['lessons'] as $lesson) {
                if (!is_array($lesson)
                    || !self::slug($lesson['slug'] ?? null)
                    || !self::title($lesson['title'] ?? null)
                    || !is_string($lesson['body'] ?? null)
                    || strlen($lesson['body']) < 10
                    || strlen($lesson['body']) > 30000
                    || isset($lessonSlugs[$lesson['slug']])) {
                    throw new RuntimeException('Invalid or duplicate lesson in synthetic manifest.');
                }
                $lessonSlugs[$lesson['slug']] = true;
            }
        }

        return $data['courses'];
    }

    private static function slug(mixed $value): bool
    {
        return is_string($value)
            && strlen($value) <= 120
            && preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $value) === 1;
    }

    private static function title(mixed $value): bool
    {
        return is_string($value)
            && strlen(trim($value)) >= 3
            && strlen($value) <= 200;
    }
}
