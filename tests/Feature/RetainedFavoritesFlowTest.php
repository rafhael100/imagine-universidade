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

/** Real routes, middleware, migrations and queries; only Portal decisions are synthetic. */
final class RetainedFavoritesFlowTest extends TestCase
{
    private const URL = '/universidade/private/favorites/retained';
    private const SAVED = '2026-11-17 10:00:00';
    private const UTC = '2026-11-17T10:00:00Z';

    private PortalAuthority $authority;
    private int $courseSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'retained-company-a', 'retained-company-b'] as $key) {
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
                    'editor' => ['imagine-editorial', 'retained-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['retained-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['retained-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['retained-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['retained-company-a', 'same-person', PortalAccessGate::MANAGE],
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
    }

    private function actAs(string $identity = 'student-a'): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial',
            'student-b' => 'retained-company-b',
            default => 'retained-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'retained-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function course(): int
    {
        $this->actAs('editor');
        $number = ++$this->courseSequence;
        $id = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'retained-course-'.$number, 'title' => 'Título restrito '.$number,
            'category' => 'metodologia', 'summary' => 'Resumo que não pertence à preferência.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$id}/lessons", [
            'slug' => 'private-lesson', 'title' => 'Aula restrita',
            'body' => 'Conteúdo que nunca acompanha o índice de preferências.',
        ])->assertCreated();
        $this->postJson("/universidade/private/admin/courses/{$id}/publish")->assertOk();
        return $id;
    }

    /** Fixtures for volume and deliberately inconsistent publication states. */
    private function fixtureCourse(
        string $slug,
        array $statuses = ['published'],
        ?int $owner = null,
        bool $shared = true,
        bool $published = true,
    ): int {
        $id = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $owner ?? $this->organization('imagine-editorial'),
            'slug' => $slug, 'title' => 'Título restrito', 'summary' => 'Resumo restrito', 'category' => 'sistemas',
            'is_shared' => $shared, 'is_published' => $published,
            'created_at' => self::SAVED, 'updated_at' => self::SAVED,
        ]);
        foreach ($statuses as $index => $status) {
            DB::table('educational_course_versions')->insert([
                'educational_course_id' => $id, 'version' => $index + 1, 'status' => $status,
                'created_at' => self::SAVED, 'updated_at' => self::SAVED,
            ]);
        }
        return $id;
    }

    private function insertFavorite(int $course, string $identity = 'student-a', ?string $saved = self::SAVED): void
    {
        DB::table('educational_course_favorites')->insert([
            'educational_organization_id' => $this->organization(
                $identity === 'student-b' ? 'retained-company-b' : 'retained-company-a'),
            'subject_key' => $identity === 'colleague-a' ? 'another-person' : 'same-person',
            'educational_course_id' => $course, 'created_at' => $saved, 'updated_at' => $saved,
        ]);
    }

    private function favorite(int $course, string $identity = 'student-a'): void
    {
        $this->actAs($identity);
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        DB::table('educational_course_favorites')->where('educational_course_id', $course)
            ->where('educational_organization_id', $this->organization(
                $identity === 'student-b' ? 'retained-company-b' : 'retained-company-a'))
            ->where('subject_key', $identity === 'colleague-a' ? 'another-person' : 'same-person')
            ->update(['created_at' => self::SAVED, 'updated_at' => self::SAVED]);
    }

    /** @return list<int> */
    private function volume(int $count): array
    {
        $ids = [];
        for ($index = 1; $index <= $count; $index++) {
            $id = $this->fixtureCourse('volume-course-'.$index);
            $this->insertFavorite($id);
            $ids[] = $id;
        }
        $this->actAs();
        return $ids;
    }

    private function entry(int $id, string $slug, string $availability = 'available', string $saved = self::UTC): array
    {
        return ['course_id' => $id, 'course_slug' => $slug, 'saved_at' => $saved, 'availability' => $availability];
    }

    private function envelope(array $favorites = [], ?int $next = null): array
    {
        return ['schema_version' => 1, 'scope' => 'current_authenticated_student',
            'favorites' => $favorites, 'next_after_course_id' => $next];
    }

    public function test_empty_page_is_private_versioned_and_does_not_create_preferences(): void
    {
        $this->actAs();
        $response = $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope())
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertFalse($response->headers->has('Content-Disposition'));
        self::assertSame(0, DB::table('educational_course_favorites')->count());
        self::assertSame(3, DB::table('educational_organizations')->count());
    }

    public function test_scope_is_company_and_person_even_with_forged_input(): void
    {
        $first = $this->course();
        $second = $this->course();
        $third = $this->course();
        $this->favorite($first);
        $this->favorite($second, 'student-b');
        $this->favorite($third, 'colleague-a');
        $this->actAs();
        $response = $this->getJson(self::URL.'?company_id=retained-company-b&subject_key=another-person&course_id='.$second, [
            'X-Company-Id' => 'retained-company-b', 'X-Subject-Key' => 'another-person', 'X-Portal-Grant' => 'true',
        ])->assertOk()->assertExactJson($this->envelope([$this->entry($first, 'retained-course-1')]));
        foreach (['retained-company', 'same-person', 'another-person', 'subject_key', 'title', 'summary', 'category',
            'Título restrito', 'Conteúdo que', 'private-lesson', 'course_version'] as $privateValue) {
            $response->assertDontSee($privateValue);
        }
        $this->actAs('student-b');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($second, 'retained-course-2')]));
        $this->actAs('colleague-a');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($third, 'retained-course-3')]));
    }

    public function test_editor_manager_guest_and_forged_session_are_denied(): void
    {
        $this->actAs();
        foreach (['editor', 'manager-a', 'unknown-credential'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->withSession(['portal_server_credential' => null, 'portal_company_id' => null]);
        $this->getJson(self::URL.'?company_id=retained-company-a', ['X-Portal-Grant' => 'true'])->assertForbidden();
        $this->withSession(['portal_server_credential' => 'student-a', 'portal_company_id' => 'retained-company-b']);
        $this->getJson(self::URL)->assertForbidden();
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_normal_provider_still_denies_all_access(): void
    {
        $this->volume(1);
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_more_than_fifty_entries_have_an_explicit_nonduplicating_continuation(): void
    {
        $ids = $this->volume(55);
        $first = $this->getJson(self::URL)->assertOk()->assertJsonCount(50, 'favorites')
            ->assertJsonPath('next_after_course_id', $ids[49]);
        self::assertSame(array_slice($ids, 0, 50), array_column($first->json('favorites'), 'course_id'));
        self::assertSame(['course_id', 'course_slug', 'saved_at', 'availability'], array_keys($first->json('favorites.0')));
        $second = $this->getJson(self::URL.'?after_course_id='.$ids[49])->assertOk()->assertJsonCount(5, 'favorites')
            ->assertJsonPath('next_after_course_id', null);
        self::assertSame(array_slice($ids, 50), array_column($second->json('favorites'), 'course_id'));
        self::assertSame($ids, array_merge(array_column($first->json('favorites'), 'course_id'),
            array_column($second->json('favorites'), 'course_id')));
        self::assertSame(55, DB::table('educational_course_favorites')->count());
    }

    public function test_exactly_fifty_entries_have_no_fabricated_next_page(): void
    {
        $ids = $this->volume(50);
        $this->getJson(self::URL)->assertOk()->assertJsonCount(50, 'favorites')->assertJsonPath('next_after_course_id', null);
        $this->getJson(self::URL.'?after_course_id='.$ids[49])->assertOk()->assertExactJson($this->envelope());
        $this->getJson(self::URL.'?after_course_id=9007199254740991')->assertOk()->assertExactJson($this->envelope());
    }

    public function test_deleting_the_last_entry_of_a_page_does_not_break_its_cursor(): void
    {
        $ids = $this->volume(55);
        $cursor = $this->getJson(self::URL)->assertOk()->json('next_after_course_id');
        self::assertSame($ids[49], $cursor);
        $this->deleteJson("/universidade/private/courses/{$cursor}/favorite")->assertOk();
        $next = $this->getJson(self::URL.'?after_course_id='.$cursor)->assertOk()->assertJsonCount(5, 'favorites')
            ->assertJsonPath('next_after_course_id', null);
        self::assertSame(array_slice($ids, 50), array_column($next->json('favorites'), 'course_id'));
        self::assertSame(54, DB::table('educational_course_favorites')->count());
    }

    public function test_foreign_or_absent_cursor_only_limits_the_current_private_scope(): void
    {
        $first = $this->fixtureCourse('first-own');
        $foreign = $this->fixtureCourse('other-student');
        $last = $this->fixtureCourse('last-own');
        $this->insertFavorite($first);
        $this->insertFavorite($foreign, 'student-b');
        $this->insertFavorite($foreign, 'colleague-a');
        $this->insertFavorite($last);
        $this->actAs();
        $this->getJson(self::URL.'?after_course_id='.$foreign)->assertOk()
            ->assertExactJson($this->envelope([$this->entry($last, 'last-own')]));
        $this->getJson(self::URL.'?after_course_id=2147483648')->assertOk()->assertExactJson($this->envelope());
    }

    public function test_withdrawal_republication_and_removal_preserve_exact_reference_without_content(): void
    {
        $course = $this->course();
        $lesson = (int) DB::table('educational_lessons')->value('id');
        $this->favorite($course);
        $originalExport = $this->getJson('/universidade/private/favorites/export')->assertOk()->json();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($course, 'retained-course-1')]));
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->actAs();
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => []]);
        $this->getJson("/universidade/private/lessons/{$lesson}")->assertNotFound();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            $this->entry($course, 'retained-course-1', 'unavailable'),
        ]));
        $this->getJson('/universidade/private/favorites/export')->assertOk()->assertExactJson($originalExport);
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($course, 'retained-course-1')]));
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->actAs();
        $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertOk()
            ->assertExactJson(['course_id' => $course, 'favorite' => false]);
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope());
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_available_requires_both_course_flag_and_published_version(): void
    {
        $archived = $this->fixtureCourse('archived-flag-true', ['archived']);
        $flagFalse = $this->fixtureCourse('live-flag-false', ['published'], published: false);
        $withdrawn = $this->fixtureCourse('archived-and-draft', ['archived', 'draft'], published: false);
        $available = $this->fixtureCourse('live-flag-true');
        foreach ([$archived, $flagFalse, $withdrawn, $available] as $course) {
            $this->insertFavorite($course);
        }
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            $this->entry($archived, 'archived-flag-true', 'unavailable'),
            $this->entry($flagFalse, 'live-flag-false', 'unavailable'),
            $this->entry($withdrawn, 'archived-and-draft', 'unavailable'),
            $this->entry($available, 'live-flag-true'),
        ]));
    }

    public function test_never_published_unshared_foreign_and_versionless_courses_are_excluded(): void
    {
        $valid = $this->fixtureCourse('valid-course');
        $draft = $this->fixtureCourse('never-published', ['draft']);
        $private = $this->fixtureCourse('not-shared', shared: false);
        $foreign = $this->fixtureCourse('foreign-owner', owner: $this->organization('retained-company-b'));
        $versionless = $this->fixtureCourse('no-version', []);
        foreach ([$valid, $draft, $private, $foreign, $versionless] as $course) {
            $this->insertFavorite($course);
        }
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($valid, 'valid-course')]));
        self::assertSame(5, DB::table('educational_course_favorites')->count());
    }

    public function test_multiple_archived_versions_do_not_duplicate_a_retained_preference(): void
    {
        $course = $this->fixtureCourse('many-versions', ['archived', 'archived', 'archived', 'published']);
        $this->insertFavorite($course);
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([$this->entry($course, 'many-versions')]));
        self::assertSame(4, DB::table('educational_course_versions')->count());
    }

    public function test_timestamp_formats_are_canonical_utc_without_changing_original_rows_or_export_v1(): void
    {
        $course = $this->fixtureCourse('canonical-date');
        $this->insertFavorite($course);
        $this->actAs();
        foreach ([
            '2026-11-17 10:00:00' => self::UTC,
            '2026-11-17 10:00:00+00' => self::UTC,
            '2026-11-17 13:00:00+03' => self::UTC,
            '2026-11-17 13:30:00.123456+03:30' => self::UTC,
            '2026-11-17T07:00:00-0300' => self::UTC,
            '2026-11-17T10:00:00Z' => self::UTC,
        ] as $stored => $expected) {
            DB::table('educational_course_favorites')->where('educational_course_id', $course)->update(['created_at' => $stored]);
            $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
                $this->entry($course, 'canonical-date', saved: $expected),
            ]));
            $this->getJson('/universidade/private/favorites/export')->assertOk()->assertJsonPath('favorites.0.saved_at', $stored);
            self::assertSame($stored, DB::table('educational_course_favorites')->value('created_at'));
        }
    }

    public function test_malformed_stored_metadata_fails_instead_of_truncating_or_returning_partial_results(): void
    {
        $course = $this->fixtureCourse('strict-metadata');
        $this->insertFavorite($course);
        $this->actAs();
        foreach (['Invalid-Slug', 'slug with spaces', str_repeat('a', 121)] as $slug) {
            DB::table('educational_courses')->where('id', $course)->update(['slug' => $slug]);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_courses')->where('id', $course)->update(['slug' => 'strict-metadata']);
        foreach ([null, '', 'not a date', '2026-02-30 10:00:00', '2026-11-17 25:00:00'] as $saved) {
            DB::table('educational_course_favorites')->where('educational_course_id', $course)->update(['created_at' => $saved]);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_invalid_sentinel_metadata_prevents_a_successful_first_page(): void
    {
        $ids = $this->volume(51);
        DB::table('educational_course_favorites')->where('educational_course_id', $ids[50])->update(['created_at' => 'invalid']);
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable'])
            ->assertDontSee('volume-course');
        self::assertSame(51, DB::table('educational_course_favorites')->count());
    }

    public function test_stored_course_ids_outside_the_safe_integer_domain_are_not_rounded_or_returned(): void
    {
        $id = 9007199254740992;
        DB::table('educational_courses')->insert([
            'id' => $id, 'educational_organization_id' => $this->organization('imagine-editorial'),
            'slug' => 'unsafe-id', 'title' => 'Synthetic', 'is_shared' => true, 'is_published' => true,
            'created_at' => self::SAVED, 'updated_at' => self::SAVED,
        ]);
        DB::table('educational_course_versions')->insert([
            'educational_course_id' => $id, 'version' => 1, 'status' => 'published',
            'created_at' => self::SAVED, 'updated_at' => self::SAVED,
        ]);
        $this->insertFavorite($id);
        $this->actAs();
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_old_saved_at_is_not_used_as_a_retention_deadline(): void
    {
        $course = $this->fixtureCourse('old-preference');
        $this->insertFavorite($course, saved: '2020-01-01 00:00:00');
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            $this->entry($course, 'old-preference', saved: '2020-01-01T00:00:00Z'),
        ]));
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_one_metadata_query_reads_no_lesson_body_or_other_learning_records_and_never_mutates(): void
    {
        $this->volume(2);
        $queries = [];
        DB::listen(static function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $this->getJson(self::URL)->assertOk()->assertJsonCount(2, 'favorites');
        $metadata = array_values(array_filter($queries, static fn (string $sql): bool => str_contains($sql, 'educational_course_favorites')));
        self::assertCount(1, $metadata);
        self::assertStringContainsString('exists', strtolower($metadata[0]));
        self::assertStringContainsString('limit 51', strtolower($metadata[0]));
        foreach ($queries as $sql) {
            self::assertMatchesRegularExpression('/^\s*select\b/i', $sql);
            self::assertDoesNotMatchRegularExpression('/educational_lessons|educational_lesson_progress|educational_reading_positions|educational_tutor|educational_audit/i', $sql);
        }
        self::assertDoesNotMatchRegularExpression('/title|summary|category|body/i', $metadata[0]);
    }

    public function test_availability_is_from_the_same_snapshot_as_its_reference(): void
    {
        $course = $this->fixtureCourse('snapshot-course');
        $this->insertFavorite($course);
        $this->actAs();
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($course, &$changed): void {
            if (!$changed && str_contains($query->sql, 'educational_course_favorites')) {
                $changed = true;
                DB::table('educational_courses')->where('id', $course)->update(['is_published' => false]);
            }
        });
        $this->getJson(self::URL)->assertOk()->assertJsonPath('favorites.0.availability', 'available');
        self::assertTrue($changed);
        $this->getJson(self::URL)->assertOk()->assertJsonPath('favorites.0.availability', 'unavailable');
    }

    public function test_revocation_during_read_withholds_all_metadata_without_removing_preferences(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_favorites')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied'])->assertDontSee('volume-course');
        self::assertTrue($revoked);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_changed_identity_permission_revision_and_expiry_are_denied_after_query(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        $next = null;
        $changed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$next, &$changed): void {
            if (!$changed && str_contains($query->sql, 'educational_course_favorites')) {
                $changed = true;
                $authority->replacement = $next;
            }
        });
        foreach ([
            PortalGrant::allow('retained-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('retained-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
        ] as $replacement) {
            $authority->replacement = null;
            $changed = false;
            $next = $replacement;
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertTrue($changed);
        }
    }

    public function test_authority_failure_after_query_fails_closed(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains($query->sql, 'educational_course_favorites')) {
                $authority->online = false;
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_get_middleware_rechecks_after_the_controller_refresh(): void
    {
        $this->volume(1);
        $this->authority->checks = 0;
        $this->authority->denyAtCheck = 3;
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(3, $this->authority->checks);
    }

    public function test_missing_client_or_editorial_organization_is_unavailable_not_empty(): void
    {
        $this->actAs();
        DB::table('educational_organizations')->where('synthetic_key', 'retained-company-a')->update(['synthetic_key' => 'temporarily-renamed']);
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        DB::table('educational_organizations')->where('synthetic_key', 'temporarily-renamed')->update(['synthetic_key' => 'retained-company-a']);
        DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->update(['synthetic_key' => 'temporarily-renamed']);
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_database_failure_is_not_a_successful_empty_page(): void
    {
        $this->actAs();
        Schema::drop('educational_course_favorites');
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertSame(3, $this->authority->checks);
    }

    public function test_authority_is_rechecked_even_after_repository_failure(): void
    {
        $this->volume(1);
        $authority = $this->authority;
        $failed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$failed): void {
            if (!$failed && str_contains($query->sql, 'educational_course_favorites')) {
                $failed = true;
                $authority->active = false;
                throw new RuntimeException('Synthetic read failure.');
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($failed);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_malformed_cursors_are_rejected_before_the_metadata_query(): void
    {
        $this->actAs();
        $reads = 0;
        DB::listen(static function (QueryExecuted $query) use (&$reads): void {
            if (str_contains($query->sql, 'educational_course_favorites')) {
                $reads++;
            }
        });
        foreach (['0', '-1', '01', '1.5', '1e3', 'true', '', '9007199254740992', '9223372036854775808', 'a'] as $cursor) {
            $this->getJson(self::URL.'?after_course_id='.rawurlencode($cursor))->assertStatus(422)
                ->assertExactJson(['error' => 'invalid_cursor']);
        }
        $this->getJson(self::URL.'?after_course_id[]=1')->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        self::assertSame(0, $reads);
    }

    public function test_repository_denies_unusable_grants_and_invalid_cursor_ranges(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        foreach ([
            PortalGrant::deny(),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
            PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::VIEW, 0, time() + 30),
            PortalGrant::allow('imagine-editorial', 'retained-editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('retained-company-a', '../another-person', PortalAccessGate::VIEW, 1, time() + 30),
        ] as $grant) {
            self::assertSame('access_denied', $repository->retainedFavorites($grant));
        }
        $grant = PortalGrant::allow('retained-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
        foreach ([0, -1, 9007199254740992] as $cursor) {
            self::assertSame('invalid_cursor', $repository->retainedFavorites($grant, $cursor));
        }
    }
}
