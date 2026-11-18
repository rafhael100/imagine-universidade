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

/** Real routes, grants middleware, migrations and SQL; only Portal decisions are synthetic. */
final class ProgressHistoryFlowTest extends TestCase
{
    private const URL = '/universidade/private/progress/history';
    private const SAVED = '2026-11-17 10:00:00';
    private const UTC = '2026-11-17T10:00:00Z';
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
        foreach (['imagine-editorial', 'history-company-a', 'history-company-b'] as $key) {
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
                    throw new RuntimeException('Synthetic authority unavailable.');
                }
                $identities = [
                    'editor' => ['imagine-editorial', 'history-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['history-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['history-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['history-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['history-company-a', 'same-person', PortalAccessGate::MANAGE],
                ];
                $identity = $identities[$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return $this->replacement ?? PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
    }

    private function actAs(string $identity = 'student-a'): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial', 'student-b' => 'history-company-b', default => 'history-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'history-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    /** @return array{course:int,lesson:int} */
    private function publishedCourse(): array
    {
        $this->actAs('editor');
        $number = ++$this->sequence;
        $course = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'history-course-'.$number, 'title' => 'Título restrito',
            'category' => 'metodologia', 'summary' => 'Resumo restrito ao conteúdo.',
        ])->assertCreated()->json('id');
        $lesson = (int) $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'private-lesson', 'title' => 'Aula restrita', 'body' => 'Corpo que não pertence ao histórico de conclusões.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        return ['course' => $course, 'lesson' => $lesson];
    }

    /** Fixtures for volume and deliberately inconsistent states; queries remain real. */
    private function fixture(int $count = 1, string $status = 'published', bool $published = true,
        bool $lessonPublished = true, ?int $owner = null, bool $shared = true): array
    {
        $slug = 'history-fixture-'.(++$this->sequence);
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $owner ?? $this->organization('imagine-editorial'),
            'slug' => $slug, 'title' => 'Título restrito', 'summary' => 'Resumo restrito', 'category' => 'sistemas',
            'is_shared' => $shared, 'is_published' => $published, 'created_at' => self::SAVED, 'updated_at' => self::SAVED,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => $status,
            'created_at' => self::SAVED, 'updated_at' => self::SAVED,
        ]);
        $lessons = [];
        for ($index = 1; $index <= $count; $index++) {
            $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                'title' => 'Aula restrita', 'body' => 'Corpo restrito que nunca acompanha a referência.',
                'sort_order' => $index, 'is_published' => $lessonPublished,
                'created_at' => self::SAVED, 'updated_at' => self::SAVED,
            ]);
        }
        return compact('course', 'version', 'lessons', 'slug');
    }

    private function insertProgress(int $lesson, string $identity = 'student-a', string $date = self::SAVED): int
    {
        return (int) DB::table('educational_lesson_progress')->insertGetId([
            'educational_organization_id' => $this->organization($identity === 'student-b' ? 'history-company-b' : 'history-company-a'),
            'subject_key' => $identity === 'colleague-a' ? 'another-person' : 'same-person',
            'educational_lesson_id' => $lesson, 'completed_at' => $date, 'created_at' => $date, 'updated_at' => $date,
        ]);
    }

    private function complete(int $lesson, string $identity = 'student-a'): int
    {
        $this->actAs($identity);
        $this->postJson("/universidade/private/lessons/{$lesson}/complete")->assertOk()->assertExactJson(['completed' => true]);
        return (int) DB::table('educational_lesson_progress')
            ->where('educational_organization_id', $this->organization($identity === 'student-b' ? 'history-company-b' : 'history-company-a'))
            ->where('subject_key', $identity === 'colleague-a' ? 'another-person' : 'same-person')
            ->where('educational_lesson_id', $lesson)->value('id');
    }

    private function volume(int $count = 55): array
    {
        $fixture = $this->fixture($count);
        $ids = [];
        // Completion order differs from lesson IDs and all dates are equal.
        foreach (array_reverse($fixture['lessons']) as $lesson) {
            $ids[] = $this->insertProgress($lesson);
        }
        $this->actAs();
        return ['ids' => array_reverse($ids), ...$fixture];
    }

    private function envelope(array $completions = [], ?int $next = null): array
    {
        return ['schema_version' => 1, 'scope' => 'current_authenticated_student',
            'completions' => $completions, 'next_before_id' => $next];
    }

    public function test_empty_history_is_private_and_does_not_create_or_initialize_data(): void
    {
        $this->actAs();
        $response = $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope())
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertFalse($response->headers->has('Content-Disposition'));
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
        self::assertSame(3, DB::table('educational_organizations')->count());
    }

    public function test_real_completions_are_scoped_to_company_and_person_and_ignore_forged_context(): void
    {
        $course = $this->publishedCourse();
        $a = $this->complete($course['lesson']);
        $b = $this->complete($course['lesson'], 'student-b');
        $colleague = $this->complete($course['lesson'], 'colleague-a');
        foreach (['student-a' => $a, 'student-b' => $b, 'colleague-a' => $colleague] as $identity => $id) {
            $this->actAs($identity);
            $response = $this->getJson(self::URL.'?company_id=history-company-b&subject_key=another-person&completion_id='.$b, [
                'X-Company-Id' => 'history-company-b', 'X-Subject-Key' => 'another-person', 'X-Portal-Grant' => 'true',
            ])->assertOk()->assertJsonCount(1, 'completions')->assertJsonPath('completions.0.completion_id', $id);
            self::assertSame(['completion_id', 'course_slug', 'course_version', 'lesson_slug', 'completed_at', 'availability'],
                array_keys($response->json('completions.0')));
            foreach (['subject_key', 'history-company', 'same-person', 'another-person', 'course_id', 'lesson_id',
                'title', 'body', 'summary', 'category', 'Título restrito', 'Corpo que'] as $excluded) {
                $response->assertDontSee($excluded);
            }
        }
    }

    public function test_editor_manager_guest_and_forged_session_are_denied(): void
    {
        foreach (['editor', 'manager-a', 'unknown'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->withSession(['portal_server_credential' => null, 'portal_company_id' => null]);
        $this->getJson(self::URL, ['X-Portal-Grant' => 'true'])->assertForbidden();
        $this->withSession(['portal_server_credential' => 'student-a', 'portal_company_id' => 'history-company-b']);
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_normal_provider_remains_deny_all(): void
    {
        $this->volume(1);
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_history_reads_and_repeat_completion_preserve_existing_export_and_original_record(): void
    {
        $course = $this->publishedCourse();
        $id = $this->complete($course['lesson']);
        DB::table('educational_lesson_progress')->where('id', $id)->update(['completed_at' => self::SAVED]);
        $before = DB::table('educational_lesson_progress')->first();
        $export = $this->getJson('/universidade/private/progress/export')->assertOk()->json();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([[
            'completion_id' => $id, 'course_slug' => 'history-course-1', 'course_version' => 1,
            'lesson_slug' => 'private-lesson', 'completed_at' => self::UTC, 'availability' => 'available',
        ]]));
        $this->postJson("/universidade/private/lessons/{$course['lesson']}/complete")->assertOk();
        self::assertEquals($before, DB::table('educational_lesson_progress')->first());
        $this->getJson('/universidade/private/progress/export')->assertOk()->assertExactJson($export);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_record_id_pages_are_descending_without_tied_date_or_lesson_id_ambiguity(): void
    {
        $fixture = $this->volume();
        $ids = $fixture['ids'];
        DB::table('educational_lesson_progress')->where('id', $ids[0])->update(['completed_at' => '2020-01-01 00:00:00']);
        $first = $this->getJson(self::URL)->assertOk()->assertJsonCount(50, 'completions')
            ->assertJsonPath('next_before_id', $ids[49])->assertJsonPath('completions.0.lesson_slug', 'lesson-1')
            ->assertJsonPath('completions.0.completed_at', '2020-01-01T00:00:00Z');
        self::assertSame(array_slice($ids, 0, 50), array_column($first->json('completions'), 'completion_id'));
        $next = $this->getJson(self::URL.'?before_id='.$ids[49])->assertOk()->assertJsonCount(5, 'completions')
            ->assertJsonPath('next_before_id', null);
        self::assertSame(array_slice($ids, 50), array_column($next->json('completions'), 'completion_id'));
        self::assertSame(55, DB::table('educational_lesson_progress')->count());
    }

    public function test_exactly_fifty_and_an_exhausted_cursor_do_not_invent_more_history(): void
    {
        $fixture = $this->volume(50);
        $this->getJson(self::URL)->assertOk()->assertJsonCount(50, 'completions')->assertJsonPath('next_before_id', null);
        $this->getJson(self::URL.'?before_id='.end($fixture['ids']))->assertOk()->assertExactJson($this->envelope());
    }

    public function test_removed_cursor_remains_a_valid_bound_without_an_ownership_lookup(): void
    {
        $fixture = $this->volume();
        $cursor = $this->getJson(self::URL)->assertOk()->json('next_before_id');
        // Simulated approved maintenance; no deletion endpoint is introduced.
        DB::table('educational_lesson_progress')->where('id', $cursor)->delete();
        $next = $this->getJson(self::URL.'?before_id='.$cursor)->assertOk()->assertJsonCount(5, 'completions')
            ->assertJsonPath('next_before_id', null);
        self::assertSame(array_slice($fixture['ids'], 50), array_column($next->json('completions'), 'completion_id'));
    }

    public function test_foreign_missing_and_large_safe_cursors_only_limit_private_records(): void
    {
        $fixture = $this->fixture(3);
        $first = $this->insertProgress($fixture['lessons'][0]);
        $foreign = $this->insertProgress($fixture['lessons'][1], 'student-b');
        $this->insertProgress($fixture['lessons'][2]);
        $this->actAs();
        $this->getJson(self::URL.'?before_id='.$foreign)->assertOk()->assertJsonCount(1, 'completions')
            ->assertJsonPath('completions.0.completion_id', $first);
        foreach ([2147483648, 9007199254740991] as $cursor) {
            $page = $this->getJson(self::URL.'?before_id='.$cursor)->assertOk()->assertJsonCount(2, 'completions')
                ->assertJsonPath('next_before_id', null)->json('completions');
            self::assertNotContains($foreign, array_column($page, 'completion_id'));
        }
    }

    public function test_new_completions_appear_on_restart_without_shifting_the_existing_continuation(): void
    {
        $fixture = $this->volume();
        $cursor = $this->getJson(self::URL)->assertOk()->json('next_before_id');
        $new = $this->fixture();
        $newId = $this->insertProgress($new['lessons'][0]);
        $later = $this->getJson(self::URL.'?before_id='.$cursor)->assertOk()->json('completions');
        self::assertSame(array_slice($fixture['ids'], 50), array_column($later, 'completion_id'));
        $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.completion_id', $newId);
    }

    public function test_republication_keeps_old_completion_unavailable_and_the_new_lesson_incomplete(): void
    {
        $course = $this->publishedCourse();
        $old = $this->complete($course['lesson']);
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course['course']}/unpublish")->assertOk();
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.availability', 'unavailable');
        $this->getJson("/universidade/private/lessons/{$course['lesson']}")->assertNotFound();
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course['course']}/publish")->assertOk();
        $this->actAs();
        $newLesson = (int) $this->getJson("/universidade/private/courses/{$course['course']}/lessons")
            ->assertOk()->assertJsonPath('lessons.0.completed', 0)->json('lessons.0.id');
        self::assertNotSame($course['lesson'], $newLesson);
        $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.completion_id', $old)
            ->assertJsonPath('completions.0.course_version', 1)->assertJsonPath('completions.0.availability', 'unavailable');
        $new = $this->complete($newLesson);
        $this->getJson(self::URL)->assertOk()->assertJsonCount(2, 'completions')
            ->assertJsonPath('completions.0.completion_id', $new)->assertJsonPath('completions.0.course_version', 2)
            ->assertJsonPath('completions.0.availability', 'available')
            ->assertJsonPath('completions.1.completion_id', $old)->assertJsonPath('completions.1.availability', 'unavailable');
    }

    public function test_availability_requires_exact_course_version_and_lesson_flags(): void
    {
        $states = [
            [$this->fixture(status: 'archived'), 'unavailable'],
            [$this->fixture(published: false), 'unavailable'],
            [$this->fixture(lessonPublished: false), 'unavailable'],
            [$this->fixture(), 'available'],
        ];
        $expected = [];
        foreach ($states as [$fixture, $availability]) {
            $expected[$this->insertProgress($fixture['lessons'][0])] = $availability;
        }
        $this->actAs();
        $rows = $this->getJson(self::URL)->assertOk()->assertJsonCount(4, 'completions')->json('completions');
        foreach ($rows as $row) {
            self::assertSame($expected[$row['completion_id']], $row['availability']);
        }
    }

    public function test_scope_matches_export_and_excludes_draft_private_and_foreign_references(): void
    {
        $valid = $this->fixture();
        $wanted = $this->insertProgress($valid['lessons'][0]);
        foreach ([$this->fixture(status: 'draft'), $this->fixture(shared: false),
            $this->fixture(owner: $this->organization('history-company-b'))] as $excluded) {
            $this->insertProgress($excluded['lessons'][0]);
        }
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertJsonCount(1, 'completions')->assertJsonPath('completions.0.completion_id', $wanted);
        $this->getJson('/universidade/private/progress/export')->assertOk()->assertJsonCount(1, 'completions')
            ->assertJsonPath('completions.0.course_slug', $valid['slug']);
        self::assertSame(4, DB::table('educational_lesson_progress')->count());
    }

    public function test_dates_are_utc_and_safe_versions_are_not_limited_by_legacy_export_ui_caps(): void
    {
        $fixture = $this->fixture();
        $id = $this->insertProgress($fixture['lessons'][0]);
        DB::table('educational_course_versions')->where('id', $fixture['version'])->update(['version' => 1000001]);
        $this->actAs();
        foreach (['2026-11-17 10:00:00', '2026-11-17 10:00:00+00', '2026-11-17 13:00:00+03',
            '2026-11-17T13:30:00.123456+03:30', '2026-11-17T10:00:00Z'] as $stored) {
            DB::table('educational_lesson_progress')->where('id', $id)->update(['completed_at' => $stored]);
            $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.completed_at', self::UTC)
                ->assertJsonPath('completions.0.course_version', 1000001);
            self::assertSame($stored, DB::table('educational_lesson_progress')->where('id', $id)->value('completed_at'));
        }
    }

    public function test_malformed_stored_fields_refuse_the_whole_page_without_partial_metadata(): void
    {
        $fixture = $this->fixture();
        $id = $this->insertProgress($fixture['lessons'][0]);
        $this->actAs();
        foreach (['Invalid-Slug', str_repeat('a', 121)] as $slug) {
            DB::table('educational_lessons')->where('id', $fixture['lessons'][0])->update(['slug' => $slug]);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_lessons')->where('id', $fixture['lessons'][0])->update(['slug' => 'lesson-1']);
        foreach (['', 'invalid', '2026-02-30 10:00:00'] as $date) {
            DB::table('educational_lesson_progress')->where('id', $id)->update(['completed_at' => $date]);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_lesson_progress')->where('id', $id)->update(['completed_at' => self::SAVED]);
        foreach ([0, 9007199254740992] as $version) {
            DB::table('educational_course_versions')->where('id', $fixture['version'])->update(['version' => $version]);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_an_invalid_sentinel_or_unsafe_progress_id_is_not_silently_cut_off(): void
    {
        $fixture = $this->volume(51);
        DB::table('educational_lesson_progress')->where('id', $fixture['ids'][50])->update(['completed_at' => 'invalid']);
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        DB::table('educational_lesson_progress')->where('id', $fixture['ids'][50])->update(['completed_at' => self::SAVED]);
        DB::table('educational_lesson_progress')->where('id', $fixture['ids'][0])->update(['id' => 9007199254740992]);
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertSame(51, DB::table('educational_lesson_progress')->count());
    }

    public function test_read_uses_one_metadata_query_and_no_business_writes_or_other_personal_tables(): void
    {
        $this->volume(2);
        $queries = [];
        DB::listen(static function (QueryExecuted $query) use (&$queries): void { $queries[] = $query->sql; });
        $this->getJson(self::URL)->assertOk()->assertJsonCount(2, 'completions');
        $metadata = array_values(array_filter($queries, static fn (string $sql): bool => str_contains($sql, 'educational_lesson_progress')));
        self::assertCount(1, $metadata);
        self::assertStringContainsString('limit 51', strtolower($metadata[0]));
        self::assertDoesNotMatchRegularExpression('/title|body|summary|category/', $metadata[0]);
        foreach ($queries as $sql) {
            self::assertMatchesRegularExpression('/^\s*select\b/i', $sql);
            self::assertDoesNotMatchRegularExpression('/educational_course_favorites|educational_reading_positions|educational_tutor|educational_audit/i', $sql);
        }
    }

    public function test_availability_and_references_come_from_the_same_snapshot(): void
    {
        $fixture = $this->volume(1);
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($fixture, &$changed): void {
            if (!$changed && str_contains($query->sql, 'educational_lesson_progress')) {
                $changed = true;
                DB::table('educational_lessons')->where('id', $fixture['lessons'][0])->update(['is_published' => false]);
            }
        });
        $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.availability', 'available');
        self::assertTrue($changed);
        $this->getJson(self::URL)->assertOk()->assertJsonPath('completions.0.availability', 'unavailable');
    }

    public function test_revocation_during_read_withholds_all_references_without_erasing_history(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains($query->sql, 'educational_lesson_progress')) { $authority->active = false; }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_changed_scope_subject_permission_revision_and_expiry_are_denied_after_read(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        $next = null;
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$next, &$changed): void {
            if (!$changed && str_contains($query->sql, 'educational_lesson_progress')) {
                $changed = true; $authority->replacement = $next;
            }
        });
        foreach ([
            PortalGrant::allow('history-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('history-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30),
            PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
        ] as $replacement) {
            $authority->replacement = null; $changed = false; $next = $replacement;
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertTrue($changed);
        }
    }

    public function test_unavailable_authority_and_final_get_recheck_fail_closed(): void
    {
        $this->volume(1);
        $this->authority->checks = 0; $this->authority->denyAtCheck = 3;
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(3, $this->authority->checks);
        $this->authority->denyAtCheck = null;
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains($query->sql, 'educational_lesson_progress')) { $authority->online = false; }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_missing_organizations_and_database_failure_are_not_empty_history(): void
    {
        $this->actAs();
        foreach (['history-company-a', 'imagine-editorial'] as $key) {
            DB::table('educational_organizations')->where('synthetic_key', $key)->update(['synthetic_key' => 'temporarily-renamed']);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
            DB::table('educational_organizations')->where('synthetic_key', 'temporarily-renamed')->update(['synthetic_key' => $key]);
        }
        Schema::drop('educational_lesson_progress');
        $this->authority->checks = 0;
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertSame(3, $this->authority->checks);
    }

    public function test_repository_failure_still_rechecks_the_current_authority(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        $failed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$failed): void {
            if (!$failed && str_contains($query->sql, 'educational_lesson_progress')) {
                $failed = true; $authority->active = false;
                throw new RuntimeException('Synthetic result failure.');
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($failed);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_invalid_cursors_are_rejected_before_the_progress_query(): void
    {
        $this->actAs();
        $reads = 0;
        DB::listen(static function (QueryExecuted $query) use (&$reads): void {
            if (str_contains($query->sql, 'educational_lesson_progress')) { $reads++; }
        });
        foreach (['', '0', '-1', '01', '1.5', '1e3', 'true', '9007199254740992', '9223372036854775808'] as $cursor) {
            $this->getJson(self::URL.'?before_id='.rawurlencode($cursor))->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        }
        $this->getJson(self::URL.'?before_id[]=1')->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        self::assertSame(0, $reads);
    }

    public function test_internal_repository_defends_grant_and_cursor_domains(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        foreach ([PortalGrant::deny(),
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
            PortalGrant::allow('history-company-a', '../another-person', PortalAccessGate::VIEW, 1, time() + 30),
        ] as $grant) {
            self::assertSame('access_denied', $repository->progressHistory($grant));
        }
        $grant = PortalGrant::allow('history-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
        foreach ([0, -1, 9007199254740992] as $cursor) {
            self::assertSame('invalid_cursor', $repository->progressHistory($grant, $cursor));
        }
    }
}
