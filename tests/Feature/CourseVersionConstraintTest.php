<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Testes de restrição do esquema com SQLite efêmero.
 * Não constituem prova de PostgreSQL, backup ou implantação.
 */
final class CourseVersionConstraintTest extends TestCase
{
    private int $courseId;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);

        $now = now();
        $orgId = DB::table('educational_organizations')->insertGetId([
            'synthetic_key' => 'imagine-editorial',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->courseId = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $orgId,
            'slug' => 'teste-de-versoes',
            'title' => 'Curso sintético',
            'is_published' => false,
            'is_shared' => true,
            'category' => 'metodologia',
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function insertVersion(int $version, string $status): void
    {
        $now = now();
        DB::table('educational_course_versions')->insert([
            'educational_course_id' => $this->courseId,
            'version' => $version,
            'status' => $status,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function test_two_drafts_for_same_course_are_rejected_by_database(): void
    {
        $this->insertVersion(1, 'draft');
        $this->expectException(QueryException::class);
        $this->insertVersion(2, 'draft');
    }

    public function test_two_published_versions_for_same_course_are_rejected_by_database(): void
    {
        $this->insertVersion(1, 'published');
        $this->expectException(QueryException::class);
        $this->insertVersion(2, 'published');
    }

    public function test_archived_versions_remain_preserved_while_live_statuses_are_unique(): void
    {
        $this->insertVersion(1, 'archived');
        $this->insertVersion(2, 'archived');
        $this->insertVersion(3, 'draft');
        $this->insertVersion(4, 'published');

        self::assertSame(4, DB::table('educational_course_versions')
            ->where('educational_course_id', $this->courseId)->count());
    }

    public function test_different_courses_can_have_their_own_draft_and_published_versions(): void
    {
        $this->insertVersion(1, 'draft');
        $this->insertVersion(2, 'published');

        $now = now();
        $otherCourse = DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => DB::table('educational_organizations')
                ->where('synthetic_key', 'imagine-editorial')->value('id'),
            'slug' => 'segundo-curso',
            'title' => 'Segundo curso sintético',
            'is_published' => false,
            'is_shared' => true,
            'category' => 'metodologia',
            'sort_order' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('educational_course_versions')->insert([
            'educational_course_id' => $otherCourse,
            'version' => 1,
            'status' => 'draft',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        self::assertSame(3, DB::table('educational_course_versions')->count());
    }
}
