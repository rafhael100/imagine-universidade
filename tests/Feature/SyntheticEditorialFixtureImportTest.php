<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityEditorialFixtureImporter;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

final class SyntheticEditorialFixtureImportTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
    }

    public function test_explicit_cli_confirmation_is_required_before_any_write(): void
    {
        $this->artisan('university:load-synthetic-editorial')->assertExitCode(2);

        self::assertSame(0, DB::table('educational_organizations')->count());
        self::assertSame(0, DB::table('educational_courses')->count());
        self::assertSame(0, DB::table('educational_lessons')->count());
    }

    public function test_import_creates_only_three_unpublished_courses_and_eight_lessons(): void
    {
        $this->artisan('university:load-synthetic-editorial', [
            '--confirm-synthetic' => true,
        ])->assertExitCode(0);

        self::assertSame(1, DB::table('educational_organizations')->count());
        self::assertSame('imagine-editorial', DB::table('educational_organizations')
            ->value('synthetic_key'));
        self::assertSame(3, DB::table('educational_courses')->count());
        self::assertSame(3, DB::table('educational_course_versions')->count());
        self::assertSame(8, DB::table('educational_lessons')->count());
        self::assertSame(0, DB::table('educational_courses')->where('is_published', true)->count());
        self::assertSame(0, DB::table('educational_lessons')->where('is_published', true)->count());
        self::assertSame(3, DB::table('educational_course_versions')
            ->where('status', 'draft')->count());
        self::assertSame(3, DB::table('educational_courses')
            ->where('is_shared', true)->count());
        self::assertSame(0, DB::table('educational_lesson_progress')->count());

        $methodology = DB::table('educational_courses')
            ->where('slug', 'metodologia-visitas-leads-clientes')->first();
        self::assertNotNull($methodology);
        self::assertStringContainsString('Visitas', $methodology->title);
        self::assertStringContainsString('Leads', $methodology->title);
        self::assertStringContainsString('Clientes', $methodology->title);
    }

    public function test_repeated_import_does_not_overwrite_edited_content_or_history(): void
    {
        $this->artisan('university:load-synthetic-editorial', [
            '--confirm-synthetic' => true,
        ])->assertExitCode(0);

        $courseId = DB::table('educational_courses')
            ->where('slug', 'metodologia-visitas-leads-clientes')->value('id');
        $lessonId = DB::table('educational_lessons')
            ->orderBy('id')->value('id');
        self::assertNotNull($courseId);
        self::assertNotNull($lessonId);

        DB::table('educational_courses')->where('id', $courseId)
            ->update(['title' => 'Edição editorial sintética preservada']);
        DB::table('educational_lessons')->where('id', $lessonId)
            ->update(['body' => 'Aula sintética editada, que não pode ser sobrescrita.']);

        $this->artisan('university:load-synthetic-editorial', [
            '--confirm-synthetic' => true,
        ])->assertExitCode(0);

        self::assertSame(3, DB::table('educational_courses')->count());
        self::assertSame(8, DB::table('educational_lessons')->count());
        self::assertSame('Edição editorial sintética preservada',
            DB::table('educational_courses')->where('id', $courseId)->value('title'));
        self::assertSame('Aula sintética editada, que não pode ser sobrescrita.',
            DB::table('educational_lessons')->where('id', $lessonId)->value('body'));
    }

    public function test_importer_refuses_any_non_testing_application_environment(): void
    {
        $environment = $this->app->environment();
        $this->app->detectEnvironment(static fn(): string => 'production');

        try {
            $this->expectException(RuntimeException::class);
            app(UniversityEditorialFixtureImporter::class)->import();
        } finally {
            $this->app->detectEnvironment(static fn(): string => $environment);
        }
    }

    public function test_editor_can_publish_imported_courses_and_clients_have_isolated_progress(): void
    {
        $this->artisan('university:load-synthetic-editorial', [
            '--confirm-synthetic' => true,
        ])->assertExitCode(0);

        $now = now();
        foreach (['synthetic-client-a', 'synthetic-client-b'] as $company) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $company, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Test-only, never registered in the application's production provider.
        $this->app->instance(PortalAuthority::class, new class implements PortalAuthority {
            public function verify(
                string $serverSessionCredential,
                string $companyId,
                string $permission,
            ): PortalGrant {
                $sessions = [
                    'fixture-editor' => ['imagine-editorial', 'fixture-editor-subject', PortalAccessGate::MANAGE],
                    'fixture-client-a' => ['synthetic-client-a', 'fixture-person-a', PortalAccessGate::VIEW],
                    'fixture-client-b' => ['synthetic-client-b', 'fixture-person-b', PortalAccessGate::VIEW],
                ];
                $entry = $sessions[$serverSessionCredential] ?? null;
                if ($entry === null || $entry[0] !== $companyId || $entry[2] !== $permission) {
                    return PortalGrant::deny('not_authorized');
                }
                return PortalGrant::allow($entry[0], $entry[1], $entry[2], 1, time() + 30);
            }
        });

        $this->withSession([
            'portal_server_credential' => 'fixture-editor',
            'portal_company_id' => 'imagine-editorial',
        ]);

        $editorCourses = $this->getJson('/universidade/private/admin/courses')
            ->assertOk()->assertJsonCount(3, 'courses')->json('courses');
        foreach ($editorCourses as $course) {
            $this->postJson('/universidade/private/admin/courses/'.$course['id'].'/publish')
                ->assertOk()->assertJsonPath('published', true);
        }

        $this->withSession([
            'portal_server_credential' => 'fixture-client-a',
            'portal_company_id' => 'synthetic-client-a',
        ]);
        $clientCourses = $this->getJson('/universidade/private/courses')
            ->assertOk()->assertJsonCount(3, 'courses')->json('courses');
        self::assertSame([4, 2, 2], array_column($clientCourses, 'lessons_total'));
        self::assertSame([0, 0, 0], array_column($clientCourses, 'lessons_completed'));
        self::assertSame([0, 0, 0], array_column($clientCourses, 'progress_percent'));

        $lessonCount = 0;
        $firstLessonId = null;
        foreach ($clientCourses as $course) {
            $lessons = $this->getJson('/universidade/private/courses/'.$course['id'].'/lessons')
                ->assertOk()->json('lessons');
            $lessonCount += count($lessons);
            if ($firstLessonId === null) {
                $firstLessonId = $lessons[0]['id'];
            }
        }
        self::assertSame(8, $lessonCount);
        self::assertNotNull($firstLessonId);

        $this->postJson('/universidade/private/lessons/'.$firstLessonId.'/complete')
            ->assertOk()->assertJsonPath('completed', true);
        $this->getJson('/universidade/private/lessons/'.$firstLessonId.'/progress')
            ->assertOk()->assertJsonPath('completed', true);
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonPath('courses.0.lessons_total', 4)
            ->assertJsonPath('courses.0.lessons_completed', 1)
            ->assertJsonPath('courses.0.progress_percent', 25);
        $firstCourseId = $clientCourses[0]['id'];
        $lessonStates = $this->getJson('/universidade/private/courses/'.$firstCourseId.'/lessons')
            ->assertOk()->assertJsonCount(4, 'lessons')->json('lessons');
        self::assertSame([1, 0, 0, 0], array_column($lessonStates, 'completed'));
        $this->getJson('/universidade/private/admin/courses')->assertForbidden();

        $this->withSession([
            'portal_server_credential' => 'fixture-client-b',
            'portal_company_id' => 'synthetic-client-b',
        ]);
        $this->getJson('/universidade/private/courses')
            ->assertOk()->assertJsonCount(3, 'courses')
            ->assertJsonPath('courses.0.lessons_completed', 0)
            ->assertJsonPath('courses.0.progress_percent', 0);
        $lessonStatesB = $this->getJson('/universidade/private/courses/'.$clientCourses[0]['id'].'/lessons')
            ->assertOk()->assertJsonCount(4, 'lessons')->json('lessons');
        self::assertSame([0, 0, 0, 0], array_column($lessonStatesB, 'completed'));
        $this->getJson('/universidade/private/lessons/'.$firstLessonId.'/progress')
            ->assertOk()->assertJsonPath('completed', false);

        self::assertSame(1, DB::table('educational_lesson_progress')->count());
        self::assertSame(3, DB::table('educational_courses')->where('is_published', true)->count());
        self::assertSame(8, DB::table('educational_lessons')->where('is_published', true)->count());
    }

}
