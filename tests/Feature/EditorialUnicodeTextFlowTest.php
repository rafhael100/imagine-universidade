<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Real HTTP, migrations and repository; only the Portal decision is synthetic. */
final class EditorialUnicodeTextFlowTest extends TestCase
{
    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'unicode-company'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->app->instance(PortalAuthority::class, new class implements PortalAuthority {
            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $identity = [
                    'editor' => ['imagine-editorial', 'unicode-editor', PortalAccessGate::MANAGE],
                    'student' => ['unicode-company', 'unicode-student', PortalAccessGate::VIEW],
                ][$credential] ?? null;
                if ($identity === null || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 60);
            }
        });
        $this->withSession(['portal_server_credential' => 'editor', 'portal_company_id' => 'imagine-editorial']);
    }

    private function courseUrl(int $course): string
    {
        return '/universidade/private/admin/courses/'.$course;
    }

    private function createCourse(string $title = 'Curso fictício preservado', ?string $summary = 'Descrição original.'): int
    {
        return (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'unicode-course-'.(++$this->sequence), 'title' => $title,
            'category' => 'metodologia', 'summary' => $summary, 'sort_order' => 7,
        ])->assertCreated()->assertJsonPath('status', 'draft')->json('id');
    }

    private function createLesson(int $course, string $title = 'Aula fictícia preservada', string $body = 'Conteúdo original que deve permanecer.'): int
    {
        return (int) $this->postJson($this->courseUrl($course).'/lessons', [
            'slug' => 'unicode-lesson', 'title' => $title, 'body' => $body, 'sort_order' => 4,
        ])->assertCreated()->assertJsonPath('status', 'draft')->json('id');
    }

    private function snapshot(): array
    {
        $result = [];
        foreach (['educational_courses', 'educational_course_versions', 'educational_lessons', 'educational_audit_events'] as $table) {
            $result[$table] = DB::table($table)->orderBy('id')->get()
                ->map(static fn ($row): array => (array) $row)->all();
        }
        return $result;
    }

    private function assertEditorialText(int $course, int $lesson, string $courseTitle, ?string $summary, string $lessonTitle, string $body, string $status = 'draft'): void
    {
        $this->getJson('/universidade/private/admin/courses')->assertOk()->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.id', $course)->assertJsonPath('courses.0.title', $courseTitle)
            ->assertJsonPath('courses.0.summary', $summary);
        $this->getJson($this->courseUrl($course).'/lessons')->assertOk()->assertJsonCount(1, 'lessons')
            ->assertJsonPath('lessons.0.id', $lesson)->assertJsonPath('lessons.0.title', $lessonTitle)
            ->assertJsonPath('lessons.0.body', $body)->assertJsonPath('lessons.0.status', $status);
    }

    private function publicationHash(int $course): string
    {
        $check = $this->getJson($this->courseUrl($course).'/publication-check')->assertOk()
            ->assertJsonPath('ready', true)->assertJsonPath('issues', [])
            ->assertJsonPath('advisory_only', true)->assertJsonPath('lesson_count', 1);
        $hash = $check->json('content_hash');
        self::assertIsString($hash);
        self::assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $hash);
        return $hash;
    }

    private function publishAndAssertReads(int $course, int $lesson, string $courseTitle, ?string $summary, string $lessonTitle, string $body): void
    {
        $this->postJson($this->courseUrl($course).'/publish', [
            'expected_content_hash' => $this->publicationHash($course),
        ])->assertOk()->assertExactJson(['published' => true]);
        $beforeReads = $this->snapshot();
        $this->assertEditorialText($course, $lesson, $courseTitle, $summary, $lessonTitle, $body, 'published');
        $this->withSession(['portal_server_credential' => 'student', 'portal_company_id' => 'unicode-company']);
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.id', $course)->assertJsonPath('courses.0.title', $courseTitle)
            ->assertJsonPath('courses.0.summary', $summary)->assertJsonPath('courses.0.lessons_completed', 0);
        $this->getJson('/universidade/private/courses/'.$course.'/lessons')->assertOk()
            ->assertJsonCount(1, 'lessons')->assertJsonPath('lessons.0.id', $lesson)
            ->assertJsonPath('lessons.0.title', $lessonTitle);
        $this->getJson('/universidade/private/lessons/'.$lesson)->assertOk()
            ->assertJsonPath('lesson.id', $lesson)->assertJsonPath('lesson.course_id', $course)
            ->assertJsonPath('lesson.title', $lessonTitle)->assertJsonPath('lesson.body', $body);
        self::assertSame($beforeReads, $this->snapshot());
    }

    public function test_unicode_upper_limits_round_trip_through_creation_publication_and_both_read_paths(): void
    {
        // Each symbol is one Unicode code point and two UTF-16 units. The
        // existing HTTP limits count characters; no truncation is expected.
        $courseTitle = str_repeat('🧭', 200);
        $summary = str_repeat('🧭', 500);
        $lessonTitle = str_repeat('🧪', 200);
        $body = str_repeat('🧪', 30000);
        $course = $this->createCourse($courseTitle, $summary);
        $lesson = $this->createLesson($course, $lessonTitle, $body);
        $this->assertEditorialText($course, $lesson, $courseTitle, $summary, $lessonTitle, $body);
        $this->publishAndAssertReads($course, $lesson, $courseTitle, $summary, $lessonTitle, $body);
    }

    public function test_patch_accepts_unicode_upper_and_lower_limits_and_explicit_null_summary(): void
    {
        $minimumTitle = str_repeat('🧭', 3);
        $minimumBody = str_repeat('🧪', 10);
        $course = $this->createCourse($minimumTitle, null);
        $lesson = $this->createLesson($course, $minimumTitle, $minimumBody);
        $maximumTitle = str_repeat('🧭', 200);
        $maximumSummary = str_repeat('🧭', 500);
        $maximumBody = str_repeat('🧪', 30000);
        $this->patchJson($this->courseUrl($course), [
            'title' => $maximumTitle, 'category' => 'metodologia', 'summary' => $maximumSummary,
        ])->assertOk()->assertExactJson(['saved' => true]);
        $this->patchJson('/universidade/private/admin/lessons/'.$lesson, [
            'title' => $maximumTitle, 'body' => $maximumBody,
        ])->assertOk()->assertExactJson(['saved' => true]);
        $this->assertEditorialText($course, $lesson, $maximumTitle, $maximumSummary, $maximumTitle, $maximumBody);

        $this->patchJson($this->courseUrl($course), [
            'title' => $minimumTitle, 'category' => 'metodologia', 'summary' => null,
        ])->assertOk()->assertExactJson(['saved' => true]);
        $this->patchJson('/universidade/private/admin/lessons/'.$lesson, [
            'title' => $minimumTitle, 'body' => $minimumBody,
        ])->assertOk()->assertExactJson(['saved' => true]);
        $this->assertEditorialText($course, $lesson, $minimumTitle, null, $minimumTitle, $minimumBody);
        $this->publishAndAssertReads($course, $lesson, $minimumTitle, null, $minimumTitle, $minimumBody);
    }

    public function test_invalid_unicode_course_boundaries_do_not_create_edit_or_audit(): void
    {
        $course = $this->createCourse();
        $this->createLesson($course);
        $hash = $this->publicationHash($course);
        $before = $this->snapshot();
        $writes = 0;
        DB::listen(static function (QueryExecuted $query) use (&$writes): void {
            if (preg_match('/\A\s*(?:insert|update|delete)\b/i', $query->sql) === 1) {
                $writes++;
            }
        });

        foreach ([['title', str_repeat('🧭', 2)], ['title', str_repeat('🧭', 201)],
            ['summary', str_repeat('🧭', 501)]] as [$field, $value]) {
            $payload = ['title' => 'Título que não deve ser gravado', 'category' => 'negocios',
                'summary' => 'Descrição que não deve ser gravada.', 'sort_order' => 9, $field => $value];
            $this->postJson('/universidade/private/admin/courses', ['slug' => 'rejected-course', ...$payload])
                ->assertUnprocessable()->assertJsonValidationErrors([$field]);
            self::assertSame($before, $this->snapshot());
            $this->patchJson($this->courseUrl($course), $payload)
                ->assertUnprocessable()->assertJsonValidationErrors([$field]);
            self::assertSame($before, $this->snapshot());
        }
        self::assertSame($hash, $this->publicationHash($course));
        self::assertSame(0, $writes, 'Invalid text must be rejected before any data or audit mutation.');
    }

    public function test_invalid_unicode_lesson_boundaries_do_not_create_edit_or_audit(): void
    {
        $course = $this->createCourse();
        $lesson = $this->createLesson($course);
        $hash = $this->publicationHash($course);
        $before = $this->snapshot();
        $writes = 0;
        DB::listen(static function (QueryExecuted $query) use (&$writes): void {
            if (preg_match('/\A\s*(?:insert|update|delete)\b/i', $query->sql) === 1) {
                $writes++;
            }
        });

        foreach ([['title', str_repeat('🧭', 2)], ['title', str_repeat('🧭', 201)],
            ['body', str_repeat('🧪', 9)], ['body', str_repeat('🧪', 30001)]] as [$field, $value]) {
            $payload = ['title' => 'Título que não deve ser gravado',
                'body' => 'Conteúdo que não deve ser gravado.', 'sort_order' => 9, $field => $value];
            $this->postJson($this->courseUrl($course).'/lessons', ['slug' => 'rejected-lesson', ...$payload])
                ->assertUnprocessable()->assertJsonValidationErrors([$field]);
            self::assertSame($before, $this->snapshot());
            $this->patchJson('/universidade/private/admin/lessons/'.$lesson, $payload)
                ->assertUnprocessable()->assertJsonValidationErrors([$field]);
            self::assertSame($before, $this->snapshot());
        }
        self::assertSame($hash, $this->publicationHash($course));
        self::assertSame(0, $writes, 'Invalid text must be rejected before any data or audit mutation.');
    }
}
