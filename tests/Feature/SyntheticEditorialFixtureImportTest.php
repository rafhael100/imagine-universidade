<?php

declare(strict_types=1);

namespace Tests\Feature;

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
}
