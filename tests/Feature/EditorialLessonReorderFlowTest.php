<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/** Actual HTTP, migrations and transactions; only the authority is synthetic. */
final class EditorialLessonReorderFlowTest extends TestCase
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
        foreach (['imagine-editorial', 'reorder-company'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public bool $online = true;
            public int $revision = 1;
            public int $checks = 0;
            public int $inside = 0;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                if (DB::transactionLevel() > 0) {
                    $this->inside++;
                }
                if (!$this->online) {
                    throw new RuntimeException('Synthetic authority unavailable.');
                }
                $identity = [
                    'editor' => ['imagine-editorial', 'synthetic-order-editor', PortalAccessGate::MANAGE],
                    'student' => ['reorder-company', 'synthetic-student', PortalAccessGate::VIEW],
                    'manager' => ['reorder-company', 'synthetic-manager', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $identity === null || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], $this->revision, time() + 60);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->asEditor();
    }

    private function asEditor(): void
    {
        $this->withSession(['portal_server_credential' => 'editor', 'portal_company_id' => 'imagine-editorial']);
    }

    private function grant(): PortalGrant
    {
        return PortalGrant::allow('imagine-editorial', 'synthetic-order-editor', PortalAccessGate::MANAGE, 1, time() + 60);
    }

    /** @return array{course:int,version:int,ids:array<int,int>} */
    private function course(array $orders = [0, 0, 0], string $organization = 'imagine-editorial', bool $shared = true): array
    {
        $number = ++$this->sequence;
        $org = (int) DB::table('educational_organizations')->where('synthetic_key', $organization)->value('id');
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $org, 'slug' => 'order-course-'.$number,
            'title' => 'Título original '.$number, 'summary' => 'Resumo original.',
            'category' => 'metodologia', 'sort_order' => 37, 'is_shared' => $shared, 'is_published' => false,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => 'draft',
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $rows = [];
        foreach ($orders as $index => $sortOrder) {
            $rows[] = [
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                'title' => 'Título literal '.$index, 'body' => "Conteúdo original {$index}.\n\nNão reescrever.",
                'sort_order' => $sortOrder, 'is_published' => false,
                'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ];
        }
        // Fits even SQLite's conservative 999-parameter limit.
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('educational_lessons')->insert($chunk);
        }
        $ids = DB::table('educational_lessons')->where('educational_course_version_id', $version)
            ->orderBy('id')->pluck('id')->map(static fn ($id): int => (int) $id)->all();
        return ['course' => $course, 'version' => $version, 'ids' => $ids];
    }

    private function url(int|string $course): string
    {
        return '/universidade/private/admin/courses/'.$course.'/lessons/reorder';
    }

    /** @return array<int,array{id:int,sort_order:int}> */
    private function order(int $version): array
    {
        return DB::table('educational_lessons')->where('educational_course_version_id', $version)
            ->orderBy('sort_order')->orderBy('id')->get(['id', 'sort_order'])
            ->map(static fn ($row): array => ['id' => (int) $row->id, 'sort_order' => (int) $row->sort_order])->all();
    }

    private function snapshot(array $course): array
    {
        return [
            'course' => (array) DB::table('educational_courses')->where('id', $course['course'])->first(),
            'versions' => DB::table('educational_course_versions')->where('educational_course_id', $course['course'])
                ->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all(),
            'lessons' => DB::table('educational_lessons')->whereIn('educational_course_version_id',
                DB::table('educational_course_versions')->where('educational_course_id', $course['course'])->select('id'))
                ->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all(),
            'audit' => DB::table('educational_audit_events')->orderBy('id')->get()
                ->map(static fn ($row): array => (array) $row)->all(),
        ];
    }

    private function payload(array $course, ?int $lesson = null, string $direction = 'up'): array
    {
        return ['lesson_id' => $lesson ?? $course['ids'][1], 'direction' => $direction,
            'expected_order' => $this->order($course['version'])];
    }

    public function test_tied_orders_move_one_place_with_an_exact_private_receipt_and_one_minimal_audit(): void
    {
        $course = $this->course();
        $before = $this->snapshot($course);
        $payload = $this->payload($course);
        $response = $this->postJson($this->url($course['course']), $payload)->assertOk()->assertExactJson([
            'schema_version' => 1, 'scope' => 'current_editorial_draft',
            'course_id' => $course['course'], 'course_version' => 1, 'status' => 'draft',
            'lesson_id' => $course['ids'][1], 'direction' => 'up', 'changed' => true,
            'order' => [
                ['id' => $course['ids'][1], 'sort_order' => 0],
                ['id' => $course['ids'][0], 'sort_order' => 1],
                ['id' => $course['ids'][2], 'sort_order' => 2],
            ],
        ]);
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        foreach (['title', 'body', 'actor_key', 'synthetic-order-editor', 'summary'] as $excluded) {
            $response->assertDontSee($excluded);
        }
        $after = $this->snapshot($course);
        self::assertSame($before['course'], $after['course']);
        self::assertSame($before['versions'], $after['versions']);
        foreach ($before['lessons'] as $index => $lesson) {
            foreach (['id', 'educational_course_version_id', 'slug', 'title', 'body', 'is_published', 'created_at'] as $field) {
                self::assertSame($lesson[$field], $after['lessons'][$index][$field]);
            }
        }
        self::assertCount(1, $after['audit']);
        self::assertSame('course.lessons_reordered', $after['audit'][0]['action']);
        self::assertSame('course', $after['audit'][0]['resource_kind']);
        self::assertSame($course['course'], $after['audit'][0]['resource_id']);
        self::assertSame(2, $this->authority->inside);
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
    }

    public function test_distinct_and_maximum_orders_move_down_without_overflow_or_content_changes(): void
    {
        $course = $this->course([0, 9998, 9999]);
        $this->postJson($this->url($course['course']), $this->payload($course, $course['ids'][1], 'down'))
            ->assertOk()->assertJsonPath('changed', true)
            ->assertJsonPath('order.0.id', $course['ids'][0])
            ->assertJsonPath('order.1.id', $course['ids'][2])
            ->assertJsonPath('order.2.id', $course['ids'][1])
            ->assertJsonPath('order.2.sort_order', 2);
        self::assertSame([0, 1, 2], array_column($this->order($course['version']), 'sort_order'));
    }

    public function test_boundary_and_single_lesson_noops_do_not_normalize_or_touch_timestamps_or_audit(): void
    {
        $course = $this->course([14, 9999]);
        $single = $this->course([9999]);
        $updates = 0;
        DB::listen(static function (QueryExecuted $query) use (&$updates): void {
            if (preg_match('/^\s*(update|insert|delete)/i', $query->sql)) {
                $updates++;
            }
        });
        foreach ([[$course, $course['ids'][0], 'up'], [$course, $course['ids'][1], 'down'],
            [$single, $single['ids'][0], 'up'], [$single, $single['ids'][0], 'down']] as [$fixture, $id, $direction]) {
            $before = $this->snapshot($fixture);
            $this->postJson($this->url($fixture['course']), $this->payload($fixture, $id, $direction))
                ->assertOk()->assertJsonPath('changed', false)
                ->assertJsonPath('order', $this->order($fixture['version']));
            self::assertSame($before, $this->snapshot($fixture));
        }
        self::assertSame(0, $updates);
    }

    public function test_duplicate_intention_after_a_lost_receipt_is_a_noop_and_does_not_move_again(): void
    {
        $course = $this->course([0, 0, 0, 0]);
        $payload = $this->payload($course, $course['ids'][2]);
        $first = $this->postJson($this->url($course['course']), $payload)->assertOk()->assertJsonPath('changed', true)->json();
        $beforeRepeat = $this->snapshot($course);
        $writes = 0;
        DB::listen(static function (QueryExecuted $query) use (&$writes): void {
            if (preg_match('/^\s*(update|insert|delete)/i', $query->sql)) {
                $writes++;
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertOk()
            ->assertExactJson([...$first, 'changed' => false]);
        self::assertSame($beforeRepeat, $this->snapshot($course));
        self::assertSame(0, $writes);
    }

    public function test_a_second_intention_from_the_same_snapshot_conflicts_instead_of_using_the_later_order(): void
    {
        $course = $this->course([0, 0, 0, 0]);
        $first = $this->payload($course, $course['ids'][1]);
        $second = $this->payload($course, $course['ids'][3]);
        $this->postJson($this->url($course['course']), $first)->assertOk();
        $before = $this->snapshot($course);
        $this->postJson($this->url($course['course']), $second)->assertStatus(409)
            ->assertExactJson(['error' => 'draft_order_changed']);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_the_same_relative_order_with_changed_numeric_values_is_still_a_conflict(): void
    {
        $course = $this->course([0, 1, 2]);
        $payload = $this->payload($course);
        DB::table('educational_lessons')->where('id', $course['ids'][2])->update(['sort_order' => 99]);
        $before = $this->snapshot($course);
        $this->postJson($this->url($course['course']), $payload)->assertStatus(409);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_addition_or_deletion_after_the_read_never_produces_a_partial_reorder(): void
    {
        foreach (['add', 'delete'] as $change) {
            $course = $this->course();
            $payload = $this->payload($course);
            if ($change === 'add') {
                $this->postJson('/universidade/private/admin/courses/'.$course['course'].'/lessons', [
                    'slug' => 'new-lesson', 'title' => 'Nova aula concorrente', 'body' => 'Conteúdo novo de outro editor.',
                ])->assertCreated();
            } else {
                $this->deleteJson('/universidade/private/admin/lessons/'.$course['ids'][2])->assertOk();
            }
            $before = $this->snapshot($course);
            $this->postJson($this->url($course['course']), $payload)->assertStatus(409)
                ->assertExactJson(['error' => 'draft_order_changed']);
            self::assertSame($before, $this->snapshot($course));
        }
    }

    public function test_concurrent_content_changes_are_preserved_when_the_order_itself_is_unchanged(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $this->patchJson('/universidade/private/admin/lessons/'.$course['ids'][0], [
            'title' => 'Título revisado por outra pessoa',
            'body' => 'Texto concorrente que a reordenação jamais deve substituir.', 'sort_order' => 0,
        ])->assertOk();
        $this->postJson($this->url($course['course']), $payload)->assertOk();
        self::assertSame('Título revisado por outra pessoa',
            DB::table('educational_lessons')->where('id', $course['ids'][0])->value('title'));
        self::assertSame('Texto concorrente que a reordenação jamais deve substituir.',
            DB::table('educational_lessons')->where('id', $course['ids'][0])->value('body'));
    }

    public function test_published_or_archived_versions_and_published_lesson_flags_are_protected(): void
    {
        foreach (['course', 'version', 'lesson'] as $protected) {
            $course = $this->course();
            $payload = $this->payload($course);
            match ($protected) {
                'course' => DB::table('educational_courses')->where('id', $course['course'])->update(['is_published' => true]),
                'version' => DB::table('educational_course_versions')->where('id', $course['version'])->update(['status' => 'archived']),
                'lesson' => DB::table('educational_lessons')->where('id', $course['ids'][1])->update(['is_published' => true]),
            };
            $before = $this->snapshot($course);
            $this->postJson($this->url($course['course']), $payload)->assertStatus(409);
            self::assertSame($before, $this->snapshot($course));
        }
    }

    public function test_publication_fences_old_order_and_withdrawal_ids_never_target_archived_lessons(): void
    {
        $course = $this->course();
        $root = '/universidade/private/admin/courses/'.$course['course'];
        $oldPayload = $this->payload($course);
        $hash = $this->getJson($root.'/publication-check')->assertOk()->json('content_hash');
        $this->postJson($this->url($course['course']), $oldPayload)->assertOk();
        $this->postJson($root.'/publish', ['expected_content_hash' => $hash])->assertStatus(409);
        $hash = $this->getJson($root.'/publication-check')->assertOk()->json('content_hash');
        $this->postJson($root.'/publish', ['expected_content_hash' => $hash])->assertOk();
        $published = $this->snapshot($course);
        $this->postJson($this->url($course['course']), $oldPayload)->assertStatus(409);
        self::assertSame($published, $this->snapshot($course));
        $this->postJson($root.'/unpublish')->assertOk();
        $withdrawn = $this->snapshot($course);
        $this->postJson($this->url($course['course']), $oldPayload)->assertStatus(409);
        self::assertSame($withdrawn, $this->snapshot($course));
        $newVersion = (int) DB::table('educational_course_versions')->where('educational_course_id', $course['course'])
            ->where('status', 'draft')->value('id');
        $newOrder = $this->order($newVersion);
        $this->postJson($this->url($course['course']), [
            'lesson_id' => $newOrder[1]['id'], 'direction' => 'up', 'expected_order' => $newOrder,
        ])->assertOk()->assertJsonPath('course_version', 2);
        self::assertSame(array_values(array_filter($withdrawn['lessons'],
            static fn (array $row): bool => $row['educational_course_version_id'] === $course['version'])),
            DB::table('educational_lessons')->where('educational_course_version_id', $course['version'])
                ->orderBy('id')->get()->map(static fn ($row): array => (array) $row)->all());
    }

    public function test_course_scope_and_mixed_lesson_ids_do_not_disclose_or_change_foreign_material(): void
    {
        $own = $this->course();
        $other = $this->course();
        $foreign = $this->course([0, 0, 0], 'reorder-company');
        $unshared = $this->course([0, 0, 0], 'imagine-editorial', false);
        foreach ([$foreign, $unshared] as $fixture) {
            $before = $this->snapshot($fixture);
            $this->postJson($this->url($fixture['course']), $this->payload($fixture))->assertNotFound();
            self::assertSame($before, $this->snapshot($fixture));
        }
        $before = $this->snapshot($own);
        foreach ([$other, $foreign] as $fixture) {
            $this->postJson($this->url($own['course']), $this->payload($fixture))->assertStatus(409);
        }
        $mixed = $this->payload($own);
        $mixed['expected_order'][] = ['id' => $foreign['ids'][0], 'sort_order' => 0];
        $this->postJson($this->url($own['course']), $mixed)->assertStatus(409);
        self::assertSame($before, $this->snapshot($own));
    }

    public function test_students_customer_managers_guest_forged_session_and_normal_provider_are_denied(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        foreach (['student', 'manager', 'unknown'] as $credential) {
            $this->withSession(['portal_server_credential' => $credential, 'portal_company_id' => 'reorder-company']);
            $this->postJson($this->url($course['course']), [...$payload,
                'company_id' => 'imagine-editorial', 'subject_id' => 'synthetic-order-editor',
            ], ['X-Portal-Grant' => 'true', 'X-Company-Id' => 'imagine-editorial'])->assertForbidden();
        }
        $this->withSession(['portal_server_credential' => null, 'portal_company_id' => null]);
        $this->postJson($this->url($course['course']), $payload)->assertForbidden();
        $this->withSession(['portal_server_credential' => 'editor', 'portal_company_id' => 'reorder-company']);
        $this->postJson($this->url($course['course']), $payload)->assertForbidden();
        $this->asEditor();
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->postJson($this->url($course['course']), $payload)->assertForbidden();
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_real_csrf_is_required_for_the_new_post(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $this->app->instance('env', 'synthetic-reorder-csrf');
        $this->withSession(['_token' => 'synthetic-order-csrf-token']);
        $this->postJson($this->url($course['course']), $payload)->assertStatus(419);
        self::assertSame($payload['expected_order'], $this->order($course['version']));
        $this->withHeader('X-CSRF-TOKEN', 'synthetic-order-csrf-token')
            ->postJson($this->url($course['course']), $payload)->assertOk();
    }

    public function test_malformed_noncanonical_or_unsafe_snapshots_are_rejected_without_mutation(): void
    {
        $course = $this->course();
        $valid = $this->payload($course);
        $bad = [
            [...$valid, 'lesson_id' => (string) $valid['lesson_id']],
            [...$valid, 'lesson_id' => 0], [...$valid, 'lesson_id' => 9007199254740992],
            [...$valid, 'direction' => 'UP'], [...$valid, 'direction' => null],
            [...$valid, 'expected_order' => null], [...$valid, 'expected_order' => []],
            [...$valid, 'expected_order' => array_reverse($valid['expected_order'])],
            [...$valid, 'expected_order' => [$valid['expected_order'][1], $valid['expected_order'][1]]],
            [...$valid, 'expected_order' => [1 => $valid['expected_order'][1]]],
            [...$valid, 'expected_order' => [['id' => $valid['lesson_id'], 'sort_order' => 0, 'body' => 'forged']]],
            [...$valid, 'expected_order' => [$valid['expected_order'][0]]],
        ];
        foreach ([-1, 10000, '0', 1.5, null, true] as $sortOrder) {
            $bad[] = [...$valid, 'expected_order' => [['id' => $valid['lesson_id'], 'sort_order' => $sortOrder]]];
        }
        foreach ([0, -1, '12', 9007199254740992, 1.5, null, true] as $id) {
            $bad[] = [...$valid, 'expected_order' => [['id' => $id, 'sort_order' => 0]]];
        }
        $before = $this->snapshot($course);
        foreach ($bad as $payload) {
            $this->postJson($this->url($course['course']), $payload)->assertStatus(422)
                ->assertExactJson(['error' => 'invalid_order']);
        }
        foreach (['0', '9007199254740992', '999999999999999999999999'] as $id) {
            $this->postJson($this->url($id), $valid)->assertNotFound();
        }
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_ten_thousand_positions_fit_the_numeric_domain_with_bounded_parameterized_updates(): void
    {
        $course = $this->course(array_fill(0, 10000, 0));
        $payload = $this->payload($course);
        $updates = [];
        DB::listen(static function (QueryExecuted $query) use (&$updates): void {
            if (preg_match('/^\s*update\s+educational_lessons/i', $query->sql)) {
                $updates[] = count($query->bindings);
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertOk()
            ->assertJsonCount(10000, 'order')->assertJsonPath('order.9999.sort_order', 9999);
        self::assertGreaterThan(1, count($updates));
        self::assertLessThanOrEqual(40, count($updates));
        self::assertLessThanOrEqual(770, max($updates));
        self::assertSame(1, DB::table('educational_audit_events')->count());
    }

    public function test_capacity_overflow_is_not_a_truncated_order_and_does_not_write(): void
    {
        $course = $this->course(array_fill(0, 10001, 0));
        $payload = $this->payload($course);
        $this->postJson($this->url($course['course']), $payload)->assertStatus(422)
            ->assertExactJson(['error' => 'invalid_order']);
        $payload['expected_order'] = array_slice($payload['expected_order'], 0, 10000);
        $this->postJson($this->url($course['course']), $payload)->assertStatus(409)
            ->assertExactJson(['error' => 'order_limit_exceeded']);
        self::assertSame(10001, DB::table('educational_lessons')->where('educational_course_version_id', $course['version'])
            ->where('sort_order', 0)->where('updated_at', self::STAMP)->count());
        self::assertSame(0, DB::table('educational_audit_events')->count());
    }

    public function test_stored_order_and_identity_corruption_fail_closed_instead_of_returning_an_empty_or_partial_receipt(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        foreach ([-1, 10000, 'broken'] as $invalid) {
            DB::table('educational_lessons')->where('id', $course['ids'][2])->update(['sort_order' => $invalid]);
            $this->postJson($this->url($course['course']), $payload)->assertStatus(503)
                ->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_lessons')->where('id', $course['ids'][2])->update([
            'sort_order' => 0, 'id' => 9007199254740992,
        ]);
        $this->postJson($this->url($course['course']), $payload)->assertStatus(503);
        self::assertSame(0, DB::table('educational_audit_events')->count());
    }

    public function test_direct_calls_require_the_exact_fresh_authority_even_for_boundary_noops(): void
    {
        $course = $this->course();
        $before = $this->snapshot($course);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        $order = $this->order($course['version']);
        $fresh = [
            PortalGrant::deny('revoked'),
            PortalGrant::allow('imagine-editorial', 'another-editor', PortalAccessGate::MANAGE, 1, time() + 60),
            PortalGrant::allow('reorder-company', 'synthetic-order-editor', PortalAccessGate::MANAGE, 1, time() + 60),
            PortalGrant::allow('imagine-editorial', 'synthetic-order-editor', PortalAccessGate::VIEW, 1, time() + 60),
            PortalGrant::allow('imagine-editorial', 'synthetic-order-editor', PortalAccessGate::MANAGE, 2, time() + 60),
            PortalGrant::allow('imagine-editorial', 'synthetic-order-editor', PortalAccessGate::MANAGE, 1, time() - 1),
        ];
        foreach ([$course['ids'][0], $course['ids'][1]] as $id) {
            self::assertSame('access_denied', $repository->reorderDraftLessons($grant, $course['course'], $id, 'up', $order));
            foreach ($fresh as $latest) {
                self::assertSame('access_denied', $repository->reorderDraftLessons($grant, $course['course'], $id, 'up',
                    $order, static fn () => $latest));
            }
        }
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_revocation_while_waiting_or_reading_prevents_the_first_update(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        $authority = $this->authority;
        $armed = true;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, 'educational_lessons') && preg_match('/^\s*select/i', $query->sql)) {
                $armed = false;
                $authority->active = false;
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_an_exception_after_the_first_chunk_rolls_back_every_order_and_timestamp(): void
    {
        $course = $this->course(array_fill(0, 300, 0));
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        $thrown = false;
        DB::listen(static function (QueryExecuted $query) use (&$thrown): void {
            if (!$thrown && preg_match('/^\s*update\s+educational_lessons/i', $query->sql)) {
                $thrown = true;
                throw new RuntimeException('Synthetic failure after one actual chunk.');
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertTrue($thrown);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_revocation_after_a_partial_update_rolls_back_the_whole_order_and_audit(): void
    {
        $course = $this->course(array_fill(0, 300, 0));
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        $authority = $this->authority;
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$changed): void {
            if (!$changed && preg_match('/^\s*update\s+educational_lessons/i', $query->sql)) {
                $changed = true;
                $authority->active = false;
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertForbidden();
        self::assertTrue($changed);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_a_changed_grant_revision_after_audit_rolls_back_updates_and_the_audit_row(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        $authority = $this->authority;
        $inserted = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$inserted): void {
            if (!$inserted && str_contains($query->sql, 'educational_audit_events') && preg_match('/^\s*insert/i', $query->sql)) {
                $inserted = true;
                $authority->revision++;
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($inserted);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_failure_after_audit_insertion_still_rolls_back_the_successful_updates(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $before = $this->snapshot($course);
        $inserted = false;
        DB::listen(static function (QueryExecuted $query) use (&$inserted): void {
            if (!$inserted && str_contains($query->sql, 'educational_audit_events') && preg_match('/^\s*insert/i', $query->sql)) {
                $inserted = true;
                throw new RuntimeException('Synthetic failure after actual audit insert.');
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertStatus(503);
        self::assertTrue($inserted);
        self::assertSame($before, $this->snapshot($course));
    }

    public function test_database_read_failure_and_missing_editorial_organization_are_unavailable(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $armed = true;
        DB::listen(static function (QueryExecuted $query) use (&$armed): void {
            if ($armed && str_contains($query->sql, 'educational_lessons') && preg_match('/^\s*select/i', $query->sql)) {
                $armed = false;
                throw new RuntimeException('Synthetic read failure.');
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertStatus(503);
        self::assertSame($payload['expected_order'], $this->order($course['version']));
        DB::table('educational_lessons')->delete();
        DB::table('educational_course_versions')->delete();
        DB::table('educational_courses')->delete();
        DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->delete();
        $this->postJson($this->url($course['course']), $payload)->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_read_failure_with_a_revoked_authority_returns_denial_without_a_receipt(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $authority = $this->authority;
        $armed = true;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, 'educational_lessons') && preg_match('/^\s*select/i', $query->sql)) {
                $armed = false;
                $authority->online = false;
                throw new RuntimeException('Synthetic read and authority failure.');
            }
        });
        $this->postJson($this->url($course['course']), $payload)->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertSame($payload['expected_order'], $this->order($course['version']));
    }

    public function test_reorder_uses_only_editorial_metadata_and_does_not_query_private_learning_records(): void
    {
        $course = $this->course();
        $payload = $this->payload($course);
        $queries = [];
        DB::listen(static function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $this->postJson($this->url($course['course']), $payload)->assertOk();
        foreach ($queries as $sql) {
            foreach (['educational_lesson_progress', 'educational_course_favorites', 'educational_reading_positions'] as $table) {
                self::assertStringNotContainsString($table, $sql);
            }
            if (str_contains($sql, 'educational_lessons') && preg_match('/^\s*select/i', $sql)) {
                self::assertStringNotContainsString('"title"', $sql);
                self::assertStringNotContainsString('"body"', $sql);
                self::assertStringNotContainsString('*', $sql);
            }
        }
    }
}
