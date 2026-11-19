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
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

final class EditorialOverviewFlowTest extends TestCase
{
    private const URL = '/universidade/private/admin/overview';

    private PortalAuthority $authority;
    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'overview-company-a', 'overview-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public bool $online = true;
            public int $checks = 0;
            public ?int $denyAtCheck = null;
            public ?PortalGrant $replacement = null;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                if (!$this->online) {
                    throw new RuntimeException('Synthetic overview authority unavailable');
                }
                $identities = [
                    'editor' => ['imagine-editorial', 'overview-editor', PortalAccessGate::MANAGE],
                    'student' => ['overview-company-a', 'overview-person', PortalAccessGate::VIEW],
                    'manager' => ['overview-company-a', 'overview-person', PortalAccessGate::MANAGE],
                ];
                $identity = $identities[$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return $this->replacement
                    ?? PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->actAs('editor');
    }

    private function actAs(string $identity): void
    {
        $this->withSession(['portal_server_credential' => $identity,
            'portal_company_id' => $identity === 'editor' ? 'imagine-editorial' : 'overview-company-a']);
    }

    private function organization(string $key = 'imagine-editorial'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function course(string $category = 'metodologia', ?string $summary = 'Resumo editorial',
        bool $published = false, string $owner = 'imagine-editorial', bool $shared = true): int
    {
        $number = ++$this->sequence;
        return (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $this->organization($owner),
            'slug' => 'overview-course-'.$number, 'title' => 'Título interno '.$number,
            'category' => $category, 'summary' => $summary,
            'is_shared' => $shared, 'is_published' => $published,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function version(int $course, int $number, string $status, int $lessons): int
    {
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => $number, 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        for ($i = 1; $i <= $lessons; $i++) {
            DB::table('educational_lessons')->insert([
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$i,
                'title' => 'Aula interna '.$i, 'body' => 'Conteúdo editorial que não pertence ao resumo agregado.',
                'is_published' => $status === 'published', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return $version;
    }

    private function expected(array $totals = [], array $categories = []): array
    {
        $base = ['courses' => 0, 'published_courses' => 0, 'draft_courses' => 0, 'current_lessons' => 0];
        return ['schema_version' => 1, 'scope' => 'current_editorial_catalog',
            'totals' => array_replace($base + ['courses_without_lessons' => 0, 'courses_without_summary' => 0], $totals),
            'categories' => array_map(static fn (string $name): array =>
                ['category' => $name] + array_replace($base, $categories[$name] ?? []),
                ['metodologia', 'negocios', 'sistemas'])];
    }

    public function test_empty_editorial_catalog_is_valid_with_three_fixed_zero_categories(): void
    {
        $response = $this->getJson(self::URL)->assertOk()->assertExactJson($this->expected())
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertSame(['metodologia', 'negocios', 'sistemas'], array_column($response->json('categories'), 'category'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        foreach ($response->json('totals') as $count) {
            self::assertIsInt($count);
        }
    }

    public function test_only_shared_editorial_courses_contribute_and_forged_scope_is_ignored(): void
    {
        $published = $this->course('metodologia', 'Resumo', true);
        $this->version($published, 1, 'published', 2);
        $draft = $this->course('negocios', null);
        $this->version($draft, 1, 'draft', 0);
        $private = $this->course('sistemas', null, false, 'imagine-editorial', false);
        $this->version($private, 1, 'draft', 7);
        foreach (['overview-company-a', 'overview-company-b'] as $owner) {
            $foreign = $this->course('sistemas', null, true, $owner);
            $this->version($foreign, 1, 'published', 9);
        }
        $response = $this->getJson(self::URL.'?company_id=overview-company-a&subject_key=another-person', [
            'X-Company-Id' => 'overview-company-b', 'X-Portal-Grant' => 'true',
        ])->assertOk()->assertExactJson($this->expected([
            'courses' => 2, 'published_courses' => 1, 'draft_courses' => 1,
            'current_lessons' => 2, 'courses_without_lessons' => 1, 'courses_without_summary' => 1,
        ], [
            'metodologia' => ['courses' => 1, 'published_courses' => 1, 'current_lessons' => 2],
            'negocios' => ['courses' => 1, 'draft_courses' => 1],
        ]));
        foreach (['overview-company', 'overview-editor', 'overview-person', 'Título interno',
            'Conteúdo editorial', 'course_id', 'subject_key', 'ready', 'approved'] as $excluded) {
            $response->assertDontSee($excluded);
        }
    }

    public function test_latest_version_number_matches_editor_lessons_without_adding_archived_versions(): void
    {
        $course = $this->course('sistemas');
        $latest = $this->version($course, 3, 'draft', 2);
        $this->version($course, 1, 'archived', 7);
        $older = $this->version($course, 2, 'archived', 5);
        self::assertGreaterThan($latest, $older, 'The larger row ID deliberately belongs to an older version.');
        $this->getJson("/universidade/private/admin/courses/{$course}/lessons")->assertOk()->assertJsonCount(2, 'lessons');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->expected([
            'courses' => 1, 'draft_courses' => 1, 'current_lessons' => 2,
        ], ['sistemas' => ['courses' => 1, 'draft_courses' => 1, 'current_lessons' => 2]]));
    }

    public function test_real_publication_withdrawal_and_draft_deletion_keep_counts_current(): void
    {
        $course = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'overview-real-flow', 'title' => 'Curso de fluxo real', 'category' => 'metodologia',
        ])->assertCreated()->json('id');
        $this->getJson(self::URL)->assertOk()->assertJsonPath('totals.courses_without_lessons', 1);
        $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'actual-lesson', 'title' => 'Aula do fluxo', 'body' => 'Conteúdo sintético suficiente para o teste.',
        ])->assertCreated();
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->getJson(self::URL)->assertOk()->assertJsonPath('totals.published_courses', 1)
            ->assertJsonPath('totals.draft_courses', 0)->assertJsonPath('totals.current_lessons', 1);
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->getJson(self::URL)->assertOk()->assertJsonPath('totals.published_courses', 0)
            ->assertJsonPath('totals.draft_courses', 1)->assertJsonPath('totals.current_lessons', 1);
        $lesson = (int) $this->getJson("/universidade/private/admin/courses/{$course}/lessons")->assertOk()->json('lessons.0.id');
        $this->deleteJson("/universidade/private/admin/lessons/{$lesson}")->assertOk();
        $this->getJson(self::URL)->assertOk()->assertJsonPath('totals.current_lessons', 0)
            ->assertJsonPath('totals.courses_without_lessons', 1)->assertJsonPath('totals.courses_without_summary', 1);
        self::assertSame(1, DB::table('educational_lessons')->count(), 'The archived lesson remains stored but is not counted.');
    }

    public function test_courses_without_versions_and_blank_summaries_are_advisory_counts(): void
    {
        foreach ([null, '', '   ', " \t\n\r\v ", 'Resumo disponível'] as $summary) {
            $this->course('negocios', $summary);
        }
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->expected([
            'courses' => 5, 'draft_courses' => 5, 'courses_without_lessons' => 5, 'courses_without_summary' => 4,
        ], ['negocios' => ['courses' => 5, 'draft_courses' => 5]]));
    }

    public function test_snapshot_uses_one_aggregate_statement_and_never_reads_or_mutates_personal_tables(): void
    {
        $course = $this->course('negocios');
        $version = $this->version($course, 1, 'draft', 1);
        $lesson = (int) DB::table('educational_lessons')->where('educational_course_version_id', $version)->value('id');
        $student = $this->organization('overview-company-a');
        DB::table('educational_course_favorites')->insert([
            'educational_organization_id' => $student, 'subject_key' => 'private-student-person',
            'educational_course_id' => $course, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('educational_lesson_progress')->insert([
            'educational_organization_id' => $student, 'subject_key' => 'private-student-person',
            'educational_lesson_id' => $lesson, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $personalBefore = [DB::table('educational_course_favorites')->get()->all(), DB::table('educational_lesson_progress')->get()->all()];
        $queries = [];
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use (&$queries, &$changed, $course): void {
            $queries[] = strtolower($query->sql);
            if (!$changed && str_contains(strtolower($query->sql), 'count(*) as courses')) {
                $changed = true;
                // The first SQL snapshot has completed. A subsequent change
                // must not mix a new category or warning into that response.
                DB::table('educational_courses')->where('id', $course)->update(['category' => 'sistemas', 'summary' => null]);
            }
        });
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->expected([
            'courses' => 1, 'draft_courses' => 1, 'current_lessons' => 1,
        ], ['negocios' => ['courses' => 1, 'draft_courses' => 1, 'current_lessons' => 1]]));
        self::assertTrue($changed);
        self::assertCount(1, array_filter($queries, static fn (string $sql): bool => str_contains($sql, 'count(*) as courses')));
        foreach ($queries as $query) {
            self::assertStringNotContainsString('educational_course_favorites', $query);
            self::assertStringNotContainsString('educational_lesson_progress', $query);
            self::assertStringNotContainsString('tutor', $query);
        }
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->expected([
            'courses' => 1, 'draft_courses' => 1, 'current_lessons' => 1, 'courses_without_summary' => 1,
        ], ['sistemas' => ['courses' => 1, 'draft_courses' => 1, 'current_lessons' => 1]]));
        self::assertEquals($personalBefore,
            [DB::table('educational_course_favorites')->get()->all(), DB::table('educational_lesson_progress')->get()->all()]);
    }

    public function test_client_manager_student_guest_and_forged_session_are_denied(): void
    {
        $this->course();
        foreach (['manager', 'student', 'unknown'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->withSession(['portal_server_credential' => null, 'portal_company_id' => null]);
        $this->getJson(self::URL.'?company_id=imagine-editorial', ['X-Portal-Grant' => 'true'])->assertForbidden();
        $this->withSession(['portal_server_credential' => 'editor', 'portal_company_id' => 'overview-company-a']);
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_normal_unavailable_provider_remains_deny_all(): void
    {
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_missing_editorial_organization_is_unavailable_not_an_empty_catalog(): void
    {
        DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->delete();
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_unknown_stored_category_is_unavailable_instead_of_omitted_from_totals(): void
    {
        $this->course();
        $malformed = $this->course('unexpected-category');
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        DB::table('educational_courses')->where('id', $malformed)->update(['category' => 'sistemas']);
        $this->getJson(self::URL)->assertOk()->assertJsonPath('totals.courses', 2);
    }

    public function test_database_failure_does_not_masquerade_as_zero_courses(): void
    {
        Schema::drop('educational_lessons');
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable'])
            ->assertDontSee('SQLSTATE')->assertDontSee('educational_lessons');
    }

    public function test_revocation_during_aggregate_query_suppresses_the_overview(): void
    {
        $this->course();
        $authority = $this->authority;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains(strtolower($query->sql), 'count(*) as courses')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($revoked);
        self::assertSame(1, DB::table('educational_courses')->count());
    }

    public function test_editor_identity_permission_and_revision_changes_after_query_are_denied(): void
    {
        $this->course();
        $authority = $this->authority;
        $next = null;
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$next, &$changed): void {
            if (!$changed && str_contains(strtolower($query->sql), 'count(*) as courses')) {
                $changed = true;
                $authority->replacement = $next;
            }
        });
        foreach ([
            PortalGrant::allow('overview-company-a', 'overview-editor', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'another-editor', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::MANAGE, 2, time() + 30),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::MANAGE, 1, time() - 1),
        ] as $replacement) {
            $authority->replacement = null;
            $changed = false;
            $next = $replacement;
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertTrue($changed);
        }
    }

    public function test_authority_unavailable_after_aggregate_query_fails_closed(): void
    {
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains(strtolower($query->sql), 'count(*) as courses')) {
                $authority->online = false;
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_get_middleware_rechecks_after_the_controller_refresh(): void
    {
        $this->authority->checks = 0;
        $this->authority->denyAtCheck = 3;
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(3, $this->authority->checks);
    }

    public function test_repository_rejects_unusable_and_noneditorial_grants(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        foreach ([
            PortalGrant::deny(),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('overview-company-a', 'overview-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::MANAGE, 1, time() - 1),
            PortalGrant::allow('imagine-editorial', 'overview-editor', PortalAccessGate::MANAGE, 0, time() + 30),
            PortalGrant::allow('imagine-editorial', '../invalid-editor', PortalAccessGate::MANAGE, 1, time() + 30),
        ] as $grant) {
            self::assertNull($repository->adminOverview($grant));
        }
    }
}
