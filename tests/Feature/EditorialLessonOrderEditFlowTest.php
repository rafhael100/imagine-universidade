<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\EditorialLessonOrderConflict;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/** Real HTTP, migrations and repository; only the Portal authority is synthetic. */
final class EditorialLessonOrderEditFlowTest extends TestCase
{
    private PortalAuthority $authority;
    private int $sequence = 0;
    private const STAMP = '2026-11-17 10:00:00';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'order-edit-company'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public bool $denyAfterTransaction = false;
            public bool $changeRevisionAfterTransaction = false;
            public int $checks = 0;
            public int $inside = 0;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                $inside = DB::transactionLevel() > 0;
                if ($inside) {
                    $this->inside++;
                }
                $identity = [
                    'editor' => ['imagine-editorial', 'synthetic-order-edit-editor', PortalAccessGate::MANAGE],
                    'student' => ['order-edit-company', 'synthetic-order-edit-student', PortalAccessGate::VIEW],
                    'manager' => ['order-edit-company', 'synthetic-order-edit-manager', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $identity === null || $identity[0] !== $companyId
                    || $identity[2] !== $permission
                    || ($this->denyAfterTransaction && !$inside && $this->inside > 0)) {
                    return PortalGrant::deny('access_denied');
                }
                $revision = $this->changeRevisionAfterTransaction && !$inside && $this->inside > 0 ? 2 : 1;
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], $revision, time() + 60);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->withSession(['portal_server_credential' => 'editor', 'portal_company_id' => 'imagine-editorial']);
    }

    private function grant(): PortalGrant
    {
        return PortalGrant::allow('imagine-editorial', 'synthetic-order-edit-editor', PortalAccessGate::MANAGE, 1, time() + 60);
    }

    /** @return array{course:int,version:int,ids:array<int,int>} */
    private function course(array $orders = [7, 9], string $organization = 'imagine-editorial', bool $shared = true): array
    {
        $number = ++$this->sequence;
        $org = (int) DB::table('educational_organizations')->where('synthetic_key', $organization)->value('id');
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $org, 'slug' => 'order-edit-course-'.$number,
            'title' => 'Curso sintético '.$number, 'summary' => 'Resumo original.',
            'category' => 'metodologia', 'sort_order' => 3, 'is_shared' => $shared, 'is_published' => false,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => 'draft',
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $ids = [];
        foreach ($orders as $index => $order) {
            $ids[] = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                'title' => 'Título original '.$index, 'body' => "Conteúdo original {$index}.\n\nPreservar ao rejeitar.",
                'sort_order' => $order, 'is_published' => false,
                'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ]);
        }
        return ['course' => $course, 'version' => $version, 'ids' => $ids];
    }

    private function url(int $lesson): string
    {
        return '/universidade/private/admin/lessons/'.$lesson;
    }

    private function payload(array $changes = []): array
    {
        return [...[
            'title' => 'Título revisado deliberadamente',
            'body' => 'Conteúdo revisado e enviado por uma ação editorial explícita.',
        ], ...$changes];
    }

    private function order(int $version): array
    {
        return DB::table('educational_lessons')->where('educational_course_version_id', $version)
            ->orderBy('sort_order')->orderBy('id')->get(['id', 'sort_order'])
            ->map(static fn ($row): array => ['id' => (int) $row->id, 'sort_order' => (int) $row->sort_order])->all();
    }

    private function snapshot(): array
    {
        $result = [];
        foreach (['educational_courses', 'educational_course_versions', 'educational_lessons', 'educational_audit_events'] as $table) {
            $result[$table] = DB::table($table)->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all();
        }
        return $result;
    }

    private function moveSecondAboveFirst(array $course): array
    {
        return $this->postJson('/universidade/private/admin/courses/'.$course['course'].'/lessons/reorder', [
            'lesson_id' => $course['ids'][1], 'direction' => 'up', 'expected_order' => $this->order($course['version']),
        ])->assertOk()->assertJsonPath('changed', true)->json('order');
    }

    public function test_patch_omission_preserves_nonzero_order_and_the_existing_success_receipt(): void
    {
        $course = $this->course();
        $order = $this->order($course['version']);
        $response = $this->patchJson($this->url($course['ids'][1]), $this->payload())
            ->assertOk()->assertExactJson(['saved' => true]);
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertSame($order, $this->order($course['version']));
        $row = DB::table('educational_lessons')->where('id', $course['ids'][1])->first();
        self::assertSame($this->payload()['title'], $row->title);
        self::assertSame($this->payload()['body'], $row->body);
        self::assertSame('lesson-1', $row->slug);
        self::assertSame(1, DB::table('educational_audit_events')->where('action', 'lesson.updated')->count());
        self::assertSame(1, $this->authority->inside);
    }

    public function test_content_patch_after_another_reorder_preserves_the_complete_confirmed_sequence(): void
    {
        $course = $this->course([0, 1]);
        $order = $this->moveSecondAboveFirst($course);
        self::assertSame([['id' => $course['ids'][1], 'sort_order' => 0], ['id' => $course['ids'][0], 'sort_order' => 1]], $order);
        $this->patchJson($this->url($course['ids'][0]), $this->payload())->assertOk()->assertExactJson(['saved' => true]);
        self::assertSame($order, $this->order($course['version']));
        self::assertSame($this->payload()['body'], DB::table('educational_lessons')->where('id', $course['ids'][0])->value('body'));
        self::assertSame(['course.lessons_reordered', 'lesson.updated'],
            DB::table('educational_audit_events')->orderBy('id')->pluck('action')->all());
    }

    public function test_creation_without_order_keeps_its_existing_zero_default(): void
    {
        $course = $this->course();
        $id = $this->postJson('/universidade/private/admin/courses/'.$course['course'].'/lessons',
            [...$this->payload(), 'slug' => 'new-synthetic-lesson'])
            ->assertCreated()->assertJsonPath('status', 'draft')->json('id');
        self::assertSame(0, (int) DB::table('educational_lessons')->where('id', $id)->value('sort_order'));
    }

    public function test_explicit_legacy_order_values_still_apply_without_a_precondition(): void
    {
        $course = $this->course();
        foreach ([0, '3', 9999] as $order) {
            $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => $order]))
                ->assertOk()->assertExactJson(['saved' => true]);
            self::assertSame((int) $order, (int) DB::table('educational_lessons')->where('id', $course['ids'][0])->value('sort_order'));
        }
    }

    public function test_matching_zero_and_maximum_preconditions_update_the_lesson_and_one_audit_each(): void
    {
        foreach ([[0, 9999], [9999, 0]] as [$expected, $target]) {
            $course = $this->course([$expected]);
            $before = DB::table('educational_audit_events')->count();
            $this->patchJson($this->url($course['ids'][0]),
                $this->payload(['sort_order' => $target, 'expected_sort_order' => $expected]))
                ->assertOk()->assertExactJson(['saved' => true]);
            $row = DB::table('educational_lessons')->where('id', $course['ids'][0])->first();
            self::assertSame($target, (int) $row->sort_order);
            self::assertSame($this->payload()['body'], $row->body);
            self::assertSame($before + 1, DB::table('educational_audit_events')->count());
        }
    }

    public function test_stale_order_after_reorder_conflicts_without_content_timestamp_or_audit_changes(): void
    {
        $course = $this->course([0, 1]);
        $this->moveSecondAboveFirst($course);
        $before = $this->snapshot();
        $response = $this->patchJson($this->url($course['ids'][0]),
            $this->payload(['sort_order' => 9, 'expected_sort_order' => 0]))
            ->assertStatus(409)->assertExactJson(['error' => 'draft_order_changed']);
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertSame($before, $this->snapshot());
        self::assertSame(0, DB::transactionLevel());
    }

    public function test_a_matching_destination_does_not_allow_replaying_content_with_a_stale_baseline(): void
    {
        $course = $this->course([5]);
        $before = $this->snapshot();
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 5, 'expected_sort_order' => 0]))
            ->assertStatus(409)->assertExactJson(['error' => 'draft_order_changed']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_the_precondition_is_only_for_this_lesson_not_other_lesson_orders(): void
    {
        $course = $this->course([0, 1]);
        $this->patchJson($this->url($course['ids'][1]), $this->payload(['sort_order' => 8]))->assertOk();
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 2, 'expected_sort_order' => 0]))->assertOk();
        self::assertSame([['id' => $course['ids'][0], 'sort_order' => 2], ['id' => $course['ids'][1], 'sort_order' => 8]],
            $this->order($course['version']));
    }

    public function test_malformed_expected_values_are_not_coerced_or_silently_ignored_by_http(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        foreach ([null, false, true, '0', '7', 1.5, -1, 10000, [], ['value' => 0]] as $expected) {
            $this->patchJson($this->url($course['ids'][0]),
                $this->payload(['sort_order' => 1, 'expected_sort_order' => $expected]))
                ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_an_expected_order_without_an_explicit_new_order_is_invalid(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['expected_sort_order' => 0]))
            ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_guarded_updates_require_an_integer_target_in_the_same_range(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        foreach ([null, false, true, '0', '3', 'broken', 1.5, -1, 10000, [], ['value' => 1]] as $order) {
            $this->patchJson($this->url($course['ids'][0]),
                $this->payload(['sort_order' => $order, 'expected_sort_order' => 0]))
                ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_domain_callers_cannot_drop_a_malformed_optional_precondition(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        foreach ([null, false, true, '0', '7', 1.5, -1, 10000, [], ['value' => 0]] as $expected) {
            self::assertFalse($repository->updateLesson($grant, $course['ids'][0],
                $this->payload(['sort_order' => 1, 'expected_sort_order' => $expected]), static fn () => $grant));
        }
        self::assertFalse($repository->updateLesson($grant, $course['ids'][0],
            $this->payload(['expected_sort_order' => 0]), static fn () => $grant));
        foreach ([null, false, true, '0', '3', 1.5, -1, 10000, [], ['value' => 1]] as $order) {
            self::assertFalse($repository->updateLesson($grant, $course['ids'][0],
                $this->payload(['sort_order' => $order, 'expected_sort_order' => 0]), static fn () => $grant));
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_domain_success_is_boolean_and_conflict_is_a_typed_exception_not_a_truthy_result(): void
    {
        $course = $this->course([0]);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        self::assertTrue($repository->updateLesson($grant, $course['ids'][0],
            $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]), static fn () => $grant));
        $before = $this->snapshot();
        $conflict = false;
        try {
            $repository->updateLesson($grant, $course['ids'][0],
                $this->payload(['sort_order' => 2, 'expected_sort_order' => 0]), static fn () => $grant);
        } catch (EditorialLessonOrderConflict) {
            $conflict = true;
        }
        self::assertTrue($conflict);
        self::assertSame($before, $this->snapshot());
        self::assertSame(0, DB::transactionLevel());
    }

    public function test_live_authority_is_required_before_a_write_or_a_protected_conflict(): void
    {
        $course = $this->course([7]);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        $before = $this->snapshot();
        foreach ([7, 0] as $expected) {
            $input = $this->payload(['sort_order' => 9, 'expected_sort_order' => $expected]);
            self::assertFalse($repository->updateLesson($grant, $course['ids'][0], $input));
            foreach ([
                PortalGrant::deny('revoked'),
                PortalGrant::allow('imagine-editorial', 'another-editor', PortalAccessGate::MANAGE, 1, time() + 60),
                PortalGrant::allow('imagine-editorial', 'synthetic-order-edit-editor', PortalAccessGate::MANAGE, 2, time() + 60),
            ] as $fresh) {
                self::assertFalse($repository->updateLesson($grant, $course['ids'][0], $input, static fn () => $fresh));
            }
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_foreign_unshared_published_and_archived_lessons_remain_uneditable(): void
    {
        foreach (['foreign', 'unshared', 'published', 'archived'] as $kind) {
            $course = $this->course([7], $kind === 'foreign' ? 'order-edit-company' : 'imagine-editorial', $kind !== 'unshared');
            if ($kind === 'published') {
                DB::table('educational_courses')->where('id', $course['course'])->update(['is_published' => true]);
            } elseif ($kind === 'archived') {
                DB::table('educational_course_versions')->where('id', $course['version'])->update(['status' => 'archived']);
            }
            $before = $this->snapshot();
            $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 9, 'expected_sort_order' => 0]))
                ->assertNotFound()->assertExactJson(['error' => 'not_found_or_published']);
            self::assertSame($before, $this->snapshot());
        }
    }

    public function test_student_non_editorial_manager_and_missing_session_cannot_use_the_guarded_write(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        foreach ([['student', 403], ['manager', 404], ['missing', 403]] as [$credential, $status]) {
            $this->withSession(['portal_server_credential' => $credential, 'portal_company_id' => 'order-edit-company']);
            $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
                ->assertStatus($status);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_guarded_write_still_requires_real_csrf_middleware(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        $this->app->instance('env', 'synthetic-order-edit-csrf');
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertStatus(419);
        self::assertSame($before, $this->snapshot());
    }

    public function test_revocation_during_lookup_preserves_the_existing_false_result_without_mutation(): void
    {
        $course = $this->course([0]);
        $before = $this->snapshot();
        $authority = $this->authority;
        $armed = true;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, 'educational_lessons') && preg_match('/^\s*select/i', $query->sql)) {
                $armed = false;
                $authority->active = false;
            }
        });
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertNotFound()->assertExactJson(['error' => 'not_found_or_published']);
        self::assertFalse($armed);
        self::assertSame($before, $this->snapshot());
    }

    public function test_conflict_is_withheld_if_authority_or_revision_changes_after_the_transaction(): void
    {
        foreach (['denyAfterTransaction', 'changeRevisionAfterTransaction'] as $change) {
            $course = $this->course([7]);
            $before = $this->snapshot();
            $this->authority->checks = 0;
            $this->authority->inside = 0;
            $this->authority->$change = true;
            $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 9, 'expected_sort_order' => 0]))
                ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertSame(3, $this->authority->checks);
            self::assertSame(1, $this->authority->inside);
            self::assertSame($before, $this->snapshot());
            $this->authority->$change = false;
        }
    }

    public function test_a_committed_success_is_not_relabelled_by_a_post_commit_authority_check(): void
    {
        $course = $this->course([0]);
        $this->authority->denyAfterTransaction = true;
        $this->patchJson($this->url($course['ids'][0]), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertOk()->assertExactJson(['saved' => true]);
        self::assertSame(2, $this->authority->checks);
        self::assertSame(1, $this->authority->inside);
        self::assertSame(1, (int) DB::table('educational_lessons')->where('id', $course['ids'][0])->value('sort_order'));
    }

    public function test_exceptions_after_update_or_audit_roll_back_content_order_timestamp_and_audit(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        foreach (['update', 'audit'] as $stage) {
            $course = $this->course([0]);
            $before = $this->snapshot();
            $fault = (object) ['armed' => true];
            DB::listen(static function (QueryExecuted $query) use ($stage, $fault): void {
                $matches = $stage === 'update'
                    ? str_contains($query->sql, 'educational_lessons') && preg_match('/^\s*update\b/i', $query->sql)
                    : str_contains($query->sql, 'educational_audit_events') && preg_match('/^\s*insert\b/i', $query->sql);
                if ($fault->armed && $matches) {
                    $fault->armed = false;
                    throw new RuntimeException('Synthetic order edit rollback.');
                }
            });
            $failed = false;
            try {
                $repository->updateLesson($grant, $course['ids'][0],
                    $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]), static fn () => $grant);
            } catch (RuntimeException $error) {
                $failed = $error->getMessage() === 'Synthetic order edit rollback.';
            }
            self::assertFalse($fault->armed);
            self::assertTrue($failed);
            self::assertSame($before, $this->snapshot());
            self::assertSame(0, DB::transactionLevel());
        }
    }
}
