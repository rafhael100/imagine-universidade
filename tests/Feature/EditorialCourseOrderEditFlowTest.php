<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\EditorialCourseOrderConflict;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/** Real HTTP, migrations and repository; only the Portal authority is synthetic. */
final class EditorialCourseOrderEditFlowTest extends TestCase
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
        foreach (['imagine-editorial', 'course-order-company'] as $key) {
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
                    'editor' => ['imagine-editorial', 'synthetic-course-order-editor', PortalAccessGate::MANAGE],
                    'student' => ['course-order-company', 'synthetic-course-order-student', PortalAccessGate::VIEW],
                    'manager' => ['course-order-company', 'synthetic-course-order-manager', PortalAccessGate::MANAGE],
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
        return PortalGrant::allow('imagine-editorial', 'synthetic-course-order-editor', PortalAccessGate::MANAGE, 1, time() + 60);
    }

    /** @return array{id:int,version:int,lesson:int,organization:int,slug:string} */
    private function course(int $order = 7, string $organization = 'imagine-editorial', bool $shared = true): array
    {
        $number = ++$this->sequence;
        $org = (int) DB::table('educational_organizations')->where('synthetic_key', $organization)->value('id');
        $slug = 'course-order-'.$number;
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $org, 'slug' => $slug,
            'title' => 'Curso sintético '.$number, 'summary' => 'Resumo original.',
            'category' => 'metodologia', 'sort_order' => $order, 'is_shared' => $shared, 'is_published' => false,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => 'draft',
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $lesson = (int) DB::table('educational_lessons')->insertGetId([
            'educational_course_version_id' => $version, 'slug' => 'lesson-'.$number,
            'title' => 'Aula sintética '.$number, 'body' => "Conteúdo sintético {$number}.\n\nPreservar literalmente.",
            'sort_order' => 4, 'is_published' => false,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        return ['id' => $course, 'version' => $version, 'lesson' => $lesson, 'organization' => $org, 'slug' => $slug];
    }

    private function url(int $course): string
    {
        return '/universidade/private/admin/courses/'.$course;
    }

    private function payload(array $changes = []): array
    {
        return [...[
            'title' => 'Curso revisado deliberadamente',
            'summary' => 'Resumo revisado e enviado por uma ação editorial explícita.',
            'category' => 'negocios',
        ], ...$changes];
    }

    private function snapshot(): array
    {
        $result = [];
        foreach (['educational_courses', 'educational_course_versions', 'educational_lessons', 'educational_audit_events'] as $table) {
            $result[$table] = DB::table($table)->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all();
        }
        return $result;
    }

    public function test_patch_omission_preserves_nonzero_course_order_and_the_existing_success_receipt(): void
    {
        $course = $this->course();
        $before = $this->snapshot();
        $response = $this->patchJson($this->url($course['id']), $this->payload())
            ->assertOk()->assertExactJson(['saved' => true]);
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $row = DB::table('educational_courses')->where('id', $course['id'])->first();
        self::assertSame(7, (int) $row->sort_order);
        self::assertSame($this->payload()['title'], $row->title);
        self::assertSame($this->payload()['summary'], $row->summary);
        self::assertSame('negocios', $row->category);
        self::assertSame($course['slug'], $row->slug);
        $after = $this->snapshot();
        self::assertSame($before['educational_course_versions'], $after['educational_course_versions']);
        self::assertSame($before['educational_lessons'], $after['educational_lessons']);
        self::assertSame(1, DB::table('educational_audit_events')->where('action', 'course.updated')->count());
        self::assertSame(1, $this->authority->inside);
    }

    public function test_an_older_text_only_patch_preserves_another_confirmed_course_order_edit(): void
    {
        $course = $this->course();
        $olderText = $this->payload(['title' => 'Título preparado na outra sessão']);
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 80]))->assertOk();
        $this->patchJson($this->url($course['id']), $olderText)->assertOk()->assertExactJson(['saved' => true]);
        $row = DB::table('educational_courses')->where('id', $course['id'])->first();
        self::assertSame(80, (int) $row->sort_order);
        self::assertSame($olderText['title'], $row->title);
        self::assertSame($olderText['summary'], $row->summary);
        self::assertSame(['course.updated', 'course.updated'],
            DB::table('educational_audit_events')->orderBy('id')->pluck('action')->all());
    }

    public function test_creation_without_order_keeps_its_zero_default_and_draft_receipt(): void
    {
        $id = $this->postJson('/universidade/private/admin/courses', [...$this->payload(), 'slug' => 'new-synthetic-course'])
            ->assertCreated()->assertJsonPath('status', 'draft')->json('id');
        self::assertSame(0, (int) DB::table('educational_courses')->where('id', $id)->value('sort_order'));
        self::assertSame('draft', DB::table('educational_course_versions')->where('educational_course_id', $id)->value('status'));
    }

    public function test_explicit_legacy_orders_remain_supported_without_a_precondition(): void
    {
        $course = $this->course();
        foreach ([0, '3', 9999] as $order) {
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => $order]))
                ->assertOk()->assertExactJson(['saved' => true]);
            self::assertSame((int) $order, (int) DB::table('educational_courses')->where('id', $course['id'])->value('sort_order'));
        }
    }

    public function test_matching_zero_and_maximum_preconditions_save_metadata_and_one_audit_each(): void
    {
        foreach ([[0, 9999], [9999, 0]] as [$expected, $target]) {
            $course = $this->course($expected);
            $before = DB::table('educational_audit_events')->count();
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => $target, 'expected_sort_order' => $expected]))
                ->assertOk()->assertExactJson(['saved' => true]);
            $row = DB::table('educational_courses')->where('id', $course['id'])->first();
            self::assertSame($target, (int) $row->sort_order);
            self::assertSame($this->payload()['summary'], $row->summary);
            self::assertSame($before + 1, DB::table('educational_audit_events')->count());
        }
    }

    public function test_a_stale_order_conflicts_without_metadata_timestamp_or_audit_changes(): void
    {
        $course = $this->course();
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 80]))->assertOk();
        $before = $this->snapshot();
        $response = $this->patchJson($this->url($course['id']), $this->payload([
            'title' => 'Texto antigo que não deve entrar', 'summary' => 'Resumo antigo.',
            'category' => 'sistemas', 'sort_order' => 2, 'expected_sort_order' => 7,
        ]))->assertStatus(409)->assertExactJson(['error' => 'draft_order_changed']);
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertSame($before, $this->snapshot());
        self::assertSame(0, DB::transactionLevel());
    }

    public function test_a_matching_destination_does_not_replay_metadata_with_a_stale_baseline(): void
    {
        $course = $this->course(80);
        $before = $this->snapshot();
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 80, 'expected_sort_order' => 7]))
            ->assertStatus(409)->assertExactJson(['error' => 'draft_order_changed']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_the_precondition_applies_only_to_the_selected_course(): void
    {
        $first = $this->course(0);
        $second = $this->course(1);
        $this->patchJson($this->url($second['id']), $this->payload(['sort_order' => 8]))->assertOk();
        $this->patchJson($this->url($first['id']), $this->payload(['sort_order' => 2, 'expected_sort_order' => 0]))->assertOk();
        self::assertSame(2, (int) DB::table('educational_courses')->where('id', $first['id'])->value('sort_order'));
        self::assertSame(8, (int) DB::table('educational_courses')->where('id', $second['id'])->value('sort_order'));
    }

    public function test_malformed_expected_values_are_not_coerced_or_ignored_by_http(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        foreach ([null, false, true, '0', '7', 1.5, -1, 10000, [], ['value' => 0]] as $expected) {
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 1, 'expected_sort_order' => $expected]))
                ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        }
        $this->call('PATCH', $this->url($course['id']), [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
        ], json_encode($this->payload(['sort_order' => 1, 'expected_sort_order' => 0.0]),
            JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION))
            ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_an_expected_order_without_an_explicit_destination_is_invalid(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        $this->patchJson($this->url($course['id']), $this->payload(['expected_sort_order' => 0]))
            ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_guarded_destinations_must_also_be_json_integers_in_range(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        foreach ([null, false, true, '0', '3', 'broken', 1.5, -1, 10000, [], ['value' => 1]] as $order) {
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => $order, 'expected_sort_order' => 0]))
                ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        }
        $this->call('PATCH', $this->url($course['id']), [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
        ], json_encode($this->payload(['sort_order' => 1.0, 'expected_sort_order' => 0]),
            JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION))
            ->assertStatus(422)->assertExactJson(['error' => 'invalid_order']);
        self::assertSame($before, $this->snapshot());
    }

    public function test_direct_domain_callers_cannot_drop_or_coerce_the_optional_guarded_pair(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        foreach ([null, false, true, '0', '7', 0.0, 1.5, -1, 10000, [], ['value' => 0]] as $expected) {
            self::assertFalse($repository->updateCourse($grant, $course['id'],
                $this->payload(['sort_order' => 1, 'expected_sort_order' => $expected]), static fn () => $grant));
        }
        self::assertFalse($repository->updateCourse($grant, $course['id'],
            $this->payload(['expected_sort_order' => 0]), static fn () => $grant));
        foreach ([null, false, true, '0', '3', 0.0, 1.5, -1, 10000, [], ['value' => 1]] as $order) {
            self::assertFalse($repository->updateCourse($grant, $course['id'],
                $this->payload(['sort_order' => $order, 'expected_sort_order' => 0]), static fn () => $grant));
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_domain_success_is_boolean_and_conflict_is_a_specific_exception(): void
    {
        $course = $this->course(0);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        self::assertTrue($repository->updateCourse($grant, $course['id'],
            $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]), static fn () => $grant));
        $before = $this->snapshot();
        $conflict = false;
        try {
            $repository->updateCourse($grant, $course['id'],
                $this->payload(['sort_order' => 2, 'expected_sort_order' => 0]), static fn () => $grant);
        } catch (EditorialCourseOrderConflict) {
            $conflict = true;
        }
        self::assertTrue($conflict);
        self::assertSame($before, $this->snapshot());
        self::assertSame(0, DB::transactionLevel());
    }

    public function test_live_authority_must_match_before_a_write_or_a_protected_conflict(): void
    {
        $course = $this->course();
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        $before = $this->snapshot();
        foreach ([7, 0] as $expected) {
            $input = $this->payload(['sort_order' => 9, 'expected_sort_order' => $expected]);
            self::assertFalse($repository->updateCourse($grant, $course['id'], $input));
            foreach ([
                PortalGrant::deny('revoked'),
                PortalGrant::allow('course-order-company', 'synthetic-course-order-editor', PortalAccessGate::MANAGE, 1, time() + 60),
                PortalGrant::allow('imagine-editorial', 'another-editor', PortalAccessGate::MANAGE, 1, time() + 60),
                PortalGrant::allow('imagine-editorial', 'synthetic-course-order-editor', PortalAccessGate::VIEW, 1, time() + 60),
                PortalGrant::allow('imagine-editorial', 'synthetic-course-order-editor', PortalAccessGate::MANAGE, 2, time() + 60),
                PortalGrant::allow('imagine-editorial', 'synthetic-course-order-editor', PortalAccessGate::MANAGE, 1, time() - 1),
            ] as $fresh) {
                self::assertFalse($repository->updateCourse($grant, $course['id'], $input, static fn () => $fresh));
            }
            self::assertFalse($repository->updateCourse($grant, $course['id'], $input,
                static function (): PortalGrant { throw new RuntimeException('Synthetic authority unavailable.'); }));
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_foreign_unshared_published_and_missing_courses_do_not_disclose_a_conflict(): void
    {
        foreach (['foreign', 'unshared', 'published', 'missing'] as $kind) {
            $course = $this->course(7, $kind === 'foreign' ? 'course-order-company' : 'imagine-editorial', $kind !== 'unshared');
            if ($kind === 'published') {
                $this->postJson($this->url($course['id']).'/publish')->assertOk();
            }
            $before = $this->snapshot();
            $id = $kind === 'missing' ? $course['id'] + 10000 : $course['id'];
            $this->patchJson($this->url($id), $this->payload(['sort_order' => 9, 'expected_sort_order' => 0]))
                ->assertNotFound()->assertExactJson(['error' => 'not_found_or_published']);
            self::assertSame($before, $this->snapshot());
        }
    }

    public function test_metadata_edit_after_withdrawal_preserves_archived_and_current_lesson_rows(): void
    {
        $course = $this->course();
        $this->postJson($this->url($course['id']).'/publish')->assertOk()->assertExactJson(['published' => true]);
        $this->postJson($this->url($course['id']).'/unpublish')->assertOk()->assertExactJson(['published' => false]);
        $before = $this->snapshot();
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 9, 'expected_sort_order' => 7]))
            ->assertOk()->assertExactJson(['saved' => true]);
        $after = $this->snapshot();
        self::assertSame($before['educational_course_versions'], $after['educational_course_versions']);
        self::assertSame($before['educational_lessons'], $after['educational_lessons']);
        self::assertSame('archived', DB::table('educational_course_versions')->where('id', $course['version'])->value('status'));
        self::assertSame(2, DB::table('educational_course_versions')->where('educational_course_id', $course['id'])->count());
        self::assertSame(9, (int) DB::table('educational_courses')->where('id', $course['id'])->value('sort_order'));
    }

    public function test_forged_scope_and_identity_fields_cannot_move_or_publish_the_course(): void
    {
        $course = $this->course(0);
        $foreign = $this->course(3, 'course-order-company');
        $foreignBefore = (array) DB::table('educational_courses')->where('id', $foreign['id'])->first();
        $this->patchJson($this->url($course['id']), $this->payload([
            'sort_order' => 1, 'expected_sort_order' => 0, 'educational_organization_id' => $foreign['organization'],
            'company_id' => 'course-order-company', 'subject_key' => 'forged-editor', 'id' => $foreign['id'],
            'slug' => 'forged-course', 'is_shared' => false, 'is_published' => true,
        ]))->assertOk()->assertExactJson(['saved' => true]);
        $row = DB::table('educational_courses')->where('id', $course['id'])->first();
        self::assertSame($course['organization'], (int) $row->educational_organization_id);
        self::assertSame($course['slug'], $row->slug);
        self::assertTrue((bool) $row->is_shared);
        self::assertFalse((bool) $row->is_published);
        self::assertSame($foreignBefore, (array) DB::table('educational_courses')->where('id', $foreign['id'])->first());
    }

    public function test_student_non_editorial_manager_and_missing_session_cannot_use_the_guarded_write(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        foreach ([['student', 403], ['manager', 404], ['missing', 403]] as [$credential, $status]) {
            $this->withSession(['portal_server_credential' => $credential, 'portal_company_id' => 'course-order-company']);
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
                ->assertStatus($status);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_guarded_course_write_still_requires_real_csrf_middleware(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        $this->app->instance('env', 'synthetic-course-order-csrf');
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertStatus(419);
        self::assertSame($before, $this->snapshot());
    }

    public function test_revocation_during_the_locked_read_preserves_the_existing_false_result(): void
    {
        $course = $this->course(0);
        $before = $this->snapshot();
        $authority = $this->authority;
        $armed = true;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, 'educational_courses') && preg_match('/^\s*select/i', $query->sql)) {
                $armed = false;
                $authority->active = false;
            }
        });
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertNotFound()->assertExactJson(['error' => 'not_found_or_published']);
        self::assertFalse($armed);
        self::assertSame($before, $this->snapshot());
    }

    public function test_conflict_is_withheld_if_authority_or_revision_changes_after_the_transaction(): void
    {
        foreach (['denyAfterTransaction', 'changeRevisionAfterTransaction'] as $change) {
            $course = $this->course();
            $before = $this->snapshot();
            $this->authority->checks = 0;
            $this->authority->inside = 0;
            $this->authority->$change = true;
            $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 9, 'expected_sort_order' => 0]))
                ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertSame(3, $this->authority->checks);
            self::assertSame(1, $this->authority->inside);
            self::assertSame($before, $this->snapshot());
            $this->authority->$change = false;
        }
    }

    public function test_a_committed_success_is_not_relabelled_by_a_post_commit_authority_check(): void
    {
        $course = $this->course(0);
        $this->authority->denyAfterTransaction = true;
        $this->patchJson($this->url($course['id']), $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]))
            ->assertOk()->assertExactJson(['saved' => true]);
        self::assertSame(2, $this->authority->checks);
        self::assertSame(1, $this->authority->inside);
        self::assertSame(1, (int) DB::table('educational_courses')->where('id', $course['id'])->value('sort_order'));
    }

    public function test_exceptions_after_update_or_audit_roll_back_metadata_order_timestamp_and_audit(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        foreach (['update', 'audit'] as $stage) {
            $course = $this->course(0);
            $before = $this->snapshot();
            $fault = (object) ['armed' => true];
            DB::listen(static function (QueryExecuted $query) use ($stage, $fault): void {
                $matches = $stage === 'update'
                    ? str_contains($query->sql, 'educational_courses') && preg_match('/^\s*update\b/i', $query->sql)
                    : str_contains($query->sql, 'educational_audit_events') && preg_match('/^\s*insert\b/i', $query->sql);
                if ($fault->armed && $matches) {
                    $fault->armed = false;
                    throw new RuntimeException('Synthetic course order edit rollback.');
                }
            });
            $failed = false;
            try {
                $repository->updateCourse($grant, $course['id'],
                    $this->payload(['sort_order' => 1, 'expected_sort_order' => 0]), static fn () => $grant);
            } catch (RuntimeException $error) {
                $failed = $error->getMessage() === 'Synthetic course order edit rollback.';
            }
            self::assertFalse($fault->armed);
            self::assertTrue($failed);
            self::assertSame($before, $this->snapshot());
            self::assertSame(0, DB::transactionLevel());
        }
    }
}
