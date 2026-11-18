<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Learning\PublishedLessonSearchCursor;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Actual HTTP, middleware, migrations, codec and SQL; only Portal is synthetic. */
final class PaginatedLessonSearchFlowTest extends TestCase
{
    private const URL = '/universidade/private/search';
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
        foreach (['imagine-editorial', 'search-company-a', 'search-company-b'] as $key) {
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
                $identity = [
                    'editor' => ['imagine-editorial', 'search-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['search-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['search-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['search-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['search-company-a', 'same-person', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return $this->replacement ?? PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->actAs();
    }

    private function actAs(string $identity = 'student-a'): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial', 'student-b' => 'search-company-b', default => 'search-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'imagine-editorial'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function grant(string $company = 'search-company-a', string $person = 'same-person'): PortalGrant
    {
        return PortalGrant::allow($company, $person, PortalAccessGate::VIEW, 1, time() + 30);
    }

    /** Synthetic volume/adverse fixtures only; the search itself is never mocked. */
    private function fixture(array $orders = [0], int $courseOrder = 0, string $status = 'published',
        bool $published = true, bool $shared = true, ?int $owner = null, bool $lessonPublished = true): array
    {
        $sequence = ++$this->sequence;
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $owner ?? $this->organization(),
            'slug' => 'search-course-'.$sequence, 'title' => 'Visitas curso '.$sequence,
            'summary' => 'Resumo que não acompanha os resultados.', 'category' => 'metodologia',
            'sort_order' => $courseOrder, 'is_shared' => $shared, 'is_published' => $published,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $lessons = [];
        foreach ($orders as $index => $order) {
            $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                'title' => 'Visitas aula '.$index, 'body' => 'Organize visitas com clareza. '.str_repeat('Exemplo sintético. ', 14),
                'sort_order' => $order, 'is_published' => $lessonPublished,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return compact('course', 'version', 'lessons');
    }

    private function page(?string $cursor = null, string $query = 'visitas'): array
    {
        return $this->postJson(self::URL, ['query' => $query, 'paginated' => true, 'cursor' => $cursor])
            ->assertOk()->assertHeader('Cache-Control', 'no-store, private')->json();
    }

    private function repository(): UniversityCatalogRepository
    {
        return $this->app->make(UniversityCatalogRepository::class);
    }

    private function snapshot(): array
    {
        $snapshot = [];
        foreach (['educational_organizations', 'educational_courses', 'educational_course_versions',
            'educational_lessons', 'educational_lesson_progress', 'educational_course_favorites',
            'educational_reading_positions', 'educational_audit_events'] as $table) {
            $snapshot[$table] = DB::table($table)->get()->map(static fn (object $row): array => (array) $row)->all();
        }
        return $snapshot;
    }

    public function test_legacy_and_opt_in_first_page_keep_identical_eight_results_and_exact_dtos(): void
    {
        $fixture = $this->fixture(range(0, 10));
        $legacy = $this->postJson(self::URL, ['query' => 'visitas'])->assertOk()->json();
        self::assertSame(['results'], array_keys($legacy));
        self::assertCount(8, $legacy['results']);
        self::assertSame($legacy, $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => false])->assertOk()->json());
        self::assertSame($legacy['results'], $this->repository()->searchPublishedLessons($this->grant(), 'visitas'));
        $page = $this->page();
        self::assertSame(['schema_version', 'scope', 'results', 'next_cursor'], array_keys($page));
        self::assertSame(1, $page['schema_version']);
        self::assertSame('current_published_editorial_lessons', $page['scope']);
        self::assertSame($legacy['results'], $page['results']);
        self::assertSame(array_slice($fixture['lessons'], 0, 8), array_column($page['results'], 'lesson_id'));
        foreach ($page['results'] as $hit) {
            self::assertSame(['course_id', 'course_title', 'lesson_id', 'lesson_title', 'snippet'], array_keys($hit));
            self::assertLessThanOrEqual(152, mb_strlen($hit['snippet'], 'UTF-8'));
        }
        self::assertIsString($page['next_cursor']);
        self::assertLessThanOrEqual(2048, strlen($page['next_cursor']));
        self::assertMatchesRegularExpression('/\A[\x21-\x7E]+\z/D', $page['next_cursor']);
        self::assertStringNotContainsString('visitas', $page['next_cursor']);
        self::assertStringNotContainsString('search-company', json_encode($page, JSON_THROW_ON_ERROR));
    }

    public function test_keyset_pages_follow_complete_course_order_id_lesson_order_id_with_ties(): void
    {
        $a = $this->fixture([2, 0, 0, 1, 1, 2, 2, 3, 3, 3], 3);
        $b = $this->fixture([0, 0, 0, 0], 3);
        $c = $this->fixture([0, 0, 0], 1);
        $expected = [...$c['lessons'], $a['lessons'][1], $a['lessons'][2], $a['lessons'][3], $a['lessons'][4],
            $a['lessons'][0], $a['lessons'][5], $a['lessons'][6], $a['lessons'][7], $a['lessons'][8], $a['lessons'][9], ...$b['lessons']];
        $first = $this->page(); $second = $this->page($first['next_cursor']); $last = $this->page($second['next_cursor']);
        self::assertCount(8, $first['results']); self::assertCount(8, $second['results']); self::assertCount(1, $last['results']);
        self::assertNull($last['next_cursor']);
        $ids = array_column([...$first['results'], ...$second['results'], ...$last['results']], 'lesson_id');
        self::assertSame($expected, $ids);
        self::assertSame($ids, array_values(array_unique($ids)));
        // Repeating an explicit read is safe; random encryption is not page identity.
        self::assertSame($second['results'], $this->page($first['next_cursor'])['results']);
    }

    public function test_zero_and_exact_eight_have_no_continuation_and_ninth_is_only_a_sentinel(): void
    {
        self::assertSame(['schema_version' => 1, 'scope' => 'current_published_editorial_lessons',
            'results' => [], 'next_cursor' => null], $this->page());
        $fixture = $this->fixture(range(0, 7));
        $eight = $this->page(); self::assertCount(8, $eight['results']); self::assertNull($eight['next_cursor']);
        $other = $this->fixture([0]);
        $nine = $this->page(); self::assertSame($eight['results'], $nine['results']);
        self::assertSame([$other['lessons'][0]], array_column($this->page($nine['next_cursor'])['results'], 'lesson_id'));
        self::assertSame($fixture['lessons'], array_column($nine['results'], 'lesson_id'));
    }

    public function test_page_sql_reads_at_most_nine_with_bound_literal_query_and_no_learning_tables_or_writes(): void
    {
        $this->fixture(range(0, 30));
        $before = $this->snapshot(); $reads = []; $unexpected = [];
        $watch = true;
        DB::listen(static function (QueryExecuted $event) use (&$watch, &$reads, &$unexpected): void {
            if (!$watch) { return; }
            if (!preg_match('/^\s*select\b/i', $event->sql)
                || preg_match('/educational_(lesson_progress|course_favorites|reading_positions|audit_events)/', $event->sql)) {
                $unexpected[] = true;
            }
            if (str_contains($event->sql, 'educational_lessons')) { $reads[] = $event; }
        });
        $first = $this->page(); $this->page($first['next_cursor']); $watch = false;
        $pages = array_values(array_filter($reads, static fn (QueryExecuted $event): bool => str_contains(strtolower($event->sql), 'limit 9')));
        self::assertCount(2, $pages);
        foreach ($pages as $query) {
            self::assertStringNotContainsString('visitas', $query->sql);
            self::assertContains('%visitas%', $query->bindings);
            self::assertStringNotContainsString('offset', strtolower($query->sql));
        }
        self::assertSame([], $unexpected);
        self::assertSame($before, $this->snapshot());
    }

    public function test_publication_scope_is_applied_to_every_page_despite_forged_client_scope(): void
    {
        $visible = $this->fixture(range(0, 9));
        $this->fixture([0], status: 'draft', published: false);
        $this->fixture([0], status: 'archived');
        $this->fixture([0], published: false);
        $this->fixture([0], shared: false);
        $this->fixture([0], owner: $this->organization('search-company-b'));
        $this->fixture([0], lessonPublished: false);
        $first = $this->page();
        $this->withHeaders(['X-Company-Id' => 'imagine-editorial', 'X-Subject-Id' => 'another-person']);
        $last = $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $first['next_cursor'],
            'company_id' => 'search-company-b', 'subject_key' => 'another-person', 'course_id' => 999999, 'limit' => 10000])
            ->assertOk()->json();
        self::assertSame($visible['lessons'], array_column([...$first['results'], ...$last['results']], 'lesson_id'));
        foreach (['student-b', 'colleague-a'] as $identity) {
            $this->actAs($identity);
            self::assertSame($last['results'], $this->page($first['next_cursor'])['results']);
        }
    }

    public function test_tampering_wrong_purpose_and_malformed_authenticated_payloads_are_generic_invalid_cursors(): void
    {
        $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        $plain = json_decode(Crypt::decryptString(substr($cursor, 3)), true, 4, JSON_THROW_ON_ERROR);
        $invalid = [substr($cursor, 0, -3).'abc', 's1.not-a-token', 'r1.'.str_repeat('a', 64)];
        foreach ([['purpose' => 'university.reading-position.absent.v1'], ['lesson_id' => '8'],
            ['course_version' => 0], ['course_sort_order' => -1], ['lesson_sort_order' => 0.5],
            ['course_id' => 9007199254740992], ['unexpected' => true]] as $replacement) {
            $invalid[] = 's1.'.Crypt::encryptString(json_encode([...$plain, ...$replacement], JSON_THROW_ON_ERROR));
        }
        foreach ($invalid as $value) {
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $value])
                ->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        }
    }

    public function test_opt_in_flag_and_cursor_are_strict_and_bounded_before_search_sql(): void
    {
        $this->fixture(range(0, 8)); $reads = 0;
        DB::listen(static function (QueryExecuted $query) use (&$reads): void {
            if (str_contains($query->sql, 'educational_lessons')) { $reads++; }
        });
        foreach ([['paginated' => 'true'], ['paginated' => 1], ['paginated' => null],
            ['paginated' => true, 'cursor' => ''], ['paginated' => true, 'cursor' => ' '],
            ['paginated' => true, 'cursor' => 1], ['paginated' => true, 'cursor' => []],
            ['paginated' => true, 'cursor' => str_repeat('a', 2049)],
            ['paginated' => true, 'cursor' => 'é'], ['cursor' => 's1.invalid'],
            ['paginated' => false, 'cursor' => 's1.invalid']] as $input) {
            $this->postJson(self::URL, ['query' => 'visitas', ...$input])->assertStatus(422)
                ->assertExactJson(['error' => 'invalid_cursor']);
        }
        self::assertSame(0, $reads);
    }

    public function test_cursor_binds_normalized_case_insensitive_query_without_an_external_query_history(): void
    {
        $fixture = $this->fixture(range(0, 9));
        $first = $this->page(null, '  VISITAS  ');
        self::assertSame(array_slice($fixture['lessons'], 8), array_column($this->page($first['next_cursor'], 'visitas')['results'], 'lesson_id'));
        $this->postJson(self::URL, ['query' => 'clientes', 'paginated' => true, 'cursor' => $first['next_cursor']])
            ->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        $this->postJson(self::URL, ['query' => 'visitas%', 'paginated' => true])->assertStatus(422);
    }

    public function test_withdrawn_anchor_requires_explicit_restart_and_never_becomes_an_empty_success(): void
    {
        $fixture = $this->fixture(range(0, 9)); $first = $this->page();
        DB::table('educational_courses')->where('id', $fixture['course'])->update(['is_published' => false]);
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $first['next_cursor']])
            ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
        self::assertSame([], $this->page()['results']);
    }

    public function test_republication_does_not_remap_an_old_cursor_to_the_new_version(): void
    {
        $fixture = $this->fixture(range(0, 9)); $first = $this->page();
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$fixture['course'].'/unpublish')->assertOk();
        $this->postJson('/universidade/private/admin/courses/'.$fixture['course'].'/publish')->assertOk();
        $this->actAs();
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $first['next_cursor']])
            ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
        $new = $this->page(); self::assertCount(8, $new['results']);
        self::assertSame([], array_intersect($fixture['lessons'], array_column($new['results'], 'lesson_id')));
    }

    public function test_course_or_lesson_order_change_invalidates_the_same_anchor_even_when_still_published(): void
    {
        $fixture = $this->fixture(range(0, 9)); $cursor = $this->page()['next_cursor'];
        foreach ([['educational_courses', $fixture['course'], 1], ['educational_lessons', $fixture['lessons'][7], 99]] as [$table, $id, $order]) {
            $before = DB::table($table)->where('id', $id)->value('sort_order');
            DB::table($table)->where('id', $id)->update(['sort_order' => $order]);
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
                ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
            DB::table($table)->where('id', $id)->update(['sort_order' => $before]);
        }
    }

    public function test_deleted_anchor_or_one_that_no_longer_matches_the_phrase_requires_restart(): void
    {
        $fixture = $this->fixture(range(0, 9)); $cursor = $this->page()['next_cursor'];
        $anchor = $fixture['lessons'][7];
        DB::table('educational_courses')->where('id', $fixture['course'])->update(['title' => 'Outro curso']);
        DB::table('educational_lessons')->where('id', $anchor)->update(['title' => 'Outro assunto', 'body' => 'Material sem a frase anterior.']);
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
            ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
        DB::table('educational_lessons')->where('id', $anchor)->delete();
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
            ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
    }

    public function test_anchor_is_rechecked_after_page_read_not_only_before_it(): void
    {
        $fixture = $this->fixture(range(0, 10)); $cursor = $this->page()['next_cursor'];
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use (&$changed, $fixture): void {
            if (!$changed && str_contains($query->sql, 'educational_lessons') && str_contains(strtolower($query->sql), 'limit 9')) {
                $changed = true;
                DB::table('educational_lessons')->where('id', $fixture['lessons'][7])->update(['is_published' => false]);
            }
        });
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
            ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
        self::assertTrue($changed);
    }

    public function test_live_catalog_changes_outside_anchor_are_not_advertised_as_a_frozen_snapshot(): void
    {
        $fixture = $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        DB::table('educational_lessons')->where('id', $fixture['lessons'][8])->update(['is_published' => false]);
        $tail = $this->page($cursor); self::assertSame([], $tail['results']); self::assertNull($tail['next_cursor']);
        $additional = $this->fixture([0], 1);
        self::assertSame($additional['lessons'], array_column($this->page($cursor)['results'], 'lesson_id'));
    }

    public function test_cursor_numeric_payload_is_not_a_means_to_select_other_publication_scopes(): void
    {
        $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        $anchor = (new PublishedLessonSearchCursor())->decode($cursor, 'visitas');
        foreach ([['course_id' => 999999], ['course_version_id' => 999999], ['course_version' => 2147483648],
            ['course_sort_order' => 2147483648], ['lesson_sort_order' => 2147483648]] as $change) {
            $signed = (new PublishedLessonSearchCursor())->encode('visitas', [...$anchor, ...$change]);
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $signed])
                ->assertStatus(409)->assertExactJson(['error' => 'search_context_changed']);
        }
    }

    public function test_invalid_ninth_identifier_refuses_the_whole_page_without_a_partial_cursor(): void
    {
        $fixture = $this->fixture(range(0, 8));
        DB::table('educational_lessons')->where('id', $fixture['lessons'][8])->update(['id' => 9007199254740992]);
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true])->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_current_authority_is_required_for_a_cursor_obtained_before_revocation(): void
    {
        $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        $this->authority->active = false;
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
            ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_revocation_during_page_read_wins_over_results_and_does_not_reveal_a_cursor(): void
    {
        $this->fixture(range(0, 8)); $authority = $this->authority; $seen = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$seen): void {
            if (!$seen && str_contains($query->sql, 'educational_lessons')) { $seen = true; $authority->active = false; }
        });
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true])
            ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($seen);
    }

    public function test_denial_wins_over_context_conflict_and_invalid_cursor_after_initial_authorization(): void
    {
        $fixture = $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        DB::table('educational_courses')->where('id', $fixture['course'])->update(['is_published' => false]);
        foreach ([$cursor, 's1.invalid'] as $value) {
            $this->authority->denyAtCheck = $this->authority->checks + 2;
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $value])
                ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
    }

    public function test_database_failure_is_generic_and_still_rechecks_actual_authority(): void
    {
        Schema::drop('educational_lessons');
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true])->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
        $this->authority->denyAtCheck = $this->authority->checks + 2;
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true])->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
    }

    public function test_legacy_failure_also_respects_revocation_without_changing_success_envelope(): void
    {
        Schema::drop('educational_lessons');
        $this->authority->denyAtCheck = $this->authority->checks + 2;
        $this->postJson(self::URL, ['query' => 'visitas'])->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_identity_revision_or_outage_change_during_read_is_denied(): void
    {
        $this->fixture(range(0, 8)); $authority = $this->authority; $mode = null;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$mode): void {
            if ($mode !== null && str_contains($query->sql, 'educational_lessons')) {
                if ($mode === 'outage') { $authority->online = false; }
                else { $authority->replacement = $mode; }
                $mode = null;
            }
        });
        foreach ([PortalGrant::allow('search-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('search-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30), 'outage'] as $replacement) {
            $authority->replacement = null; $authority->online = true; $mode = $replacement;
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true])
                ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
    }

    public function test_default_deny_and_editor_capability_do_not_accept_a_search_token_as_authority(): void
    {
        $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        foreach (['editor', 'manager-a', 'unknown'] as $identity) {
            $this->actAs($identity);
            $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])
                ->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->actAs();
        $this->postJson(self::URL, ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor])->assertForbidden();
    }

    public function test_domain_denies_invalid_grants_and_missing_organizations_without_creating_data(): void
    {
        $before = $this->snapshot();
        foreach ([PortalGrant::deny(), PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('search-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('search-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1)] as $grant) {
            self::assertSame('access_denied', $this->repository()->searchPublishedLessonsPage($grant, 'visitas'));
        }
        self::assertSame('temporarily_unavailable', $this->repository()->searchPublishedLessonsPage($this->grant('missing-company'), 'visitas'));
        self::assertSame('invalid_query', $this->repository()->searchPublishedLessonsPage($this->grant(), '%'));
        self::assertSame($before, $this->snapshot());
    }

    public function test_cursor_requires_actual_csrf_and_remains_post_only_with_existing_rate_limit(): void
    {
        $this->fixture(range(0, 8)); $cursor = $this->page()['next_cursor'];
        // Laravel's unit-test bypass is disabled without adding a fixture route.
        $this->app->instance('env', 'synthetic-csrf-check');
        $this->withSession(['_token' => 'c140-synthetic-csrf-token']);
        $input = ['query' => 'visitas', 'paginated' => true, 'cursor' => $cursor];
        $this->postJson(self::URL, $input)->assertStatus(419);
        $this->withHeader('X-CSRF-TOKEN', 'c140-synthetic-csrf-token')->postJson(self::URL, $input)->assertOk();
        $route = $this->app['router']->getRoutes()->getByAction(\App\Http\Controllers\UniversityController::class.'@searchLessons');
        self::assertSame(['POST'], $route->methods());
        self::assertContains('throttle:20,1', $route->gatherMiddleware());
    }
}
