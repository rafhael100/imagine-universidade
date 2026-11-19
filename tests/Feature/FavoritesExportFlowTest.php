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

/** Real routes, queries and migrations; only the Portal decisions are synthetic. */
final class FavoritesExportFlowTest extends TestCase
{
    private const URL = '/universidade/private/favorites/export';

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
        foreach (['imagine-editorial', 'export-company-a', 'export-company-b'] as $key) {
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
                    throw new RuntimeException('Synthetic authority unavailable');
                }
                $identities = [
                    'editor' => ['imagine-editorial', 'export-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['export-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['export-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['export-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['export-company-a', 'same-person', PortalAccessGate::MANAGE],
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

    private function actAs(string $identity): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial',
            'student-b' => 'export-company-b',
            default => 'export-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'export-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function course(bool $publish = true): int
    {
        $this->actAs('editor');
        $number = ++$this->courseSequence;
        $id = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'export-course-'.$number, 'title' => 'Título restrito '.$number,
            'category' => 'metodologia', 'summary' => 'Resumo que não pertence à exportação.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$id}/lessons", [
            'slug' => 'private-lesson', 'title' => 'Aula restrita',
            'body' => 'Conteúdo que nunca deve acompanhar a preferência exportada.',
        ])->assertCreated();
        if ($publish) {
            $this->postJson("/universidade/private/admin/courses/{$id}/publish")->assertOk();
        }
        return $id;
    }

    private function favorite(int $course, string $identity = 'student-a'): string
    {
        $this->actAs($identity);
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $company = $identity === 'student-b' ? 'export-company-b' : 'export-company-a';
        $subject = $identity === 'colleague-a' ? 'another-person' : 'same-person';
        return (string) DB::table('educational_course_favorites')
            ->where('educational_organization_id', $this->organization($company))
            ->where('subject_key', $subject)->where('educational_course_id', $course)->value('created_at');
    }

    /** @param list<array{course_slug:string,saved_at:string}> $favorites */
    private function envelope(array $favorites = []): array
    {
        return ['schema_version' => 1, 'scope' => 'current_authenticated_student', 'favorites' => $favorites];
    }

    public function test_empty_export_is_versioned_private_and_downloadable(): void
    {
        $this->actAs('student-a');
        $response = $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope())
            ->assertHeader('Content-Disposition', 'attachment; filename="imagine-universidade-favoritos.json"')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_export_is_scoped_to_company_and_person_and_ignores_forged_input(): void
    {
        $first = $this->course();
        $second = $this->course();
        $third = $this->course();
        $aSaved = $this->favorite($first);
        $bSaved = $this->favorite($second, 'student-b');
        $colleagueSaved = $this->favorite($third, 'colleague-a');

        $this->actAs('student-a');
        $response = $this->getJson(self::URL.'?company_id=export-company-b&subject_key=another-person&course_id='.$second, [
            'X-Company-Id' => 'export-company-b', 'X-Subject-Key' => 'another-person', 'X-Portal-Grant' => 'true',
        ])->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-1', 'saved_at' => $aSaved],
        ]));
        foreach (['export-company', 'same-person', 'another-person', 'subject_key', 'course_id',
            'Título restrito', 'Resumo que', 'Conteúdo que', 'private-lesson'] as $privateValue) {
            $response->assertDontSee($privateValue);
        }
        $this->actAs('student-b');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-2', 'saved_at' => $bSaved],
        ]));
        $this->actAs('colleague-a');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-3', 'saved_at' => $colleagueSaved],
        ]));
    }

    public function test_editor_manager_guest_and_forged_session_cannot_export_preferences(): void
    {
        $course = $this->course();
        $this->favorite($course);
        foreach (['editor', 'manager-a', 'unknown-credential'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->withSession(['portal_server_credential' => null, 'portal_company_id' => null]);
        $this->getJson(self::URL.'?company_id=export-company-a', ['X-Portal-Grant' => 'true'])->assertForbidden();
        $this->withSession(['portal_server_credential' => 'student-a', 'portal_company_id' => 'export-company-b']);
        $this->getJson(self::URL)->assertForbidden();
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_normal_unavailable_authority_remains_deny_all(): void
    {
        $course = $this->course();
        $this->favorite($course);
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->actAs('student-a');
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_saved_at_is_original_preference_creation_not_a_retention_deadline(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->favorite($second);
        $this->favorite($first);
        $old = now()->subDays(121)->format('Y-m-d H:i:s');
        DB::table('educational_course_favorites')->where('educational_course_id', $first)
            ->update(['created_at' => $old, 'updated_at' => $old]);
        $before = DB::table('educational_course_favorites')->orderBy('educational_course_id')->get()->all();
        $this->putJson("/universidade/private/courses/{$first}/favorite")->assertOk();
        $response = $this->getJson(self::URL)->assertOk()->assertJsonCount(2, 'favorites')
            ->assertJsonPath('favorites.0.course_slug', 'export-course-1')
            ->assertJsonPath('favorites.0.saved_at', $old)
            ->assertJsonPath('favorites.1.course_slug', 'export-course-2');
        self::assertSame(['course_slug', 'saved_at'], array_keys($response->json('favorites.0')));
        self::assertEquals($before, DB::table('educational_course_favorites')->orderBy('educational_course_id')->get()->all());
    }

    public function test_withdrawal_keeps_own_reference_without_releasing_old_course_content(): void
    {
        $course = $this->course();
        $lesson = (int) DB::table('educational_lessons')->value('id');
        $saved = $this->favorite($course);
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->actAs('student-a');
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => []]);
        $this->getJson("/universidade/private/lessons/{$lesson}")->assertNotFound();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-1', 'saved_at' => $saved],
        ]));
        $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope());
    }

    public function test_multiple_published_and_archived_versions_never_duplicate_a_preference(): void
    {
        $course = $this->course();
        $saved = $this->favorite($course);
        $this->actAs('editor');
        for ($revision = 0; $revision < 2; $revision++) {
            $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
            $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        }
        self::assertSame(3, DB::table('educational_course_versions')->where('educational_course_id', $course)->count());
        $this->actAs('student-a');
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-1', 'saved_at' => $saved],
        ]));
    }

    public function test_never_published_nonshared_and_foreign_course_rows_are_excluded(): void
    {
        $valid = $this->course();
        $draft = $this->course(false);
        $private = $this->course();
        $foreign = $this->course();
        $saved = $this->favorite($valid);
        $this->favorite($private);
        $this->favorite($foreign);
        DB::table('educational_courses')->where('id', $private)->update(['is_shared' => false]);
        DB::table('educational_courses')->where('id', $foreign)
            ->update(['educational_organization_id' => $this->organization('export-company-b')]);
        // A corrupt/injected preference is not proof that a draft was published.
        DB::table('educational_course_favorites')->insert([
            'educational_organization_id' => $this->organization(), 'subject_key' => 'same-person',
            'educational_course_id' => $draft, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            ['course_slug' => 'export-course-1', 'saved_at' => $saved],
        ]));
        self::assertSame(4, DB::table('educational_course_favorites')->count());
    }

    public function test_favorites_export_preserves_the_separate_progress_contract_and_all_records(): void
    {
        $course = $this->course();
        $lesson = (int) DB::table('educational_lessons')->value('id');
        $this->favorite($course);
        $this->postJson("/universidade/private/lessons/{$lesson}/complete")->assertOk();
        $before = $this->getJson('/universidade/private/progress/export')->assertOk()->json();
        $progress = DB::table('educational_lesson_progress')->get()->all();
        $favorites = DB::table('educational_course_favorites')->get()->all();
        $this->getJson(self::URL)->assertOk()->assertJsonCount(1, 'favorites');
        $this->getJson('/universidade/private/progress/export')->assertOk()->assertExactJson($before);
        self::assertEquals($progress, DB::table('educational_lesson_progress')->get()->all());
        self::assertEquals($favorites, DB::table('educational_course_favorites')->get()->all());
    }

    public function test_export_limit_accepts_5000_and_refuses_5001_without_partial_download(): void
    {
        $editorial = $this->organization('imagine-editorial');
        $student = $this->organization();
        $saved = '2026-11-17 10:00:00';
        // Bulk fixture only for the volume boundary; the queries and constraints
        // stay real. Small batches also fit conservative SQLite binding limits.
        foreach (array_chunk(range(1, 5001), 50) as $chunk) {
            $courses = $versions = $favorites = [];
            foreach ($chunk as $id) {
                $courses[] = ['id' => $id, 'educational_organization_id' => $editorial,
                    'slug' => sprintf('volume-course-%05d', $id), 'title' => 'Fictício',
                    'is_shared' => true, 'is_published' => true, 'created_at' => $saved, 'updated_at' => $saved];
                $versions[] = ['educational_course_id' => $id, 'version' => 1, 'status' => 'published',
                    'created_at' => $saved, 'updated_at' => $saved];
                $favorites[] = ['educational_organization_id' => $student, 'subject_key' => 'same-person',
                    'educational_course_id' => $id, 'created_at' => $saved, 'updated_at' => $saved];
            }
            DB::table('educational_courses')->insert($courses);
            DB::table('educational_course_versions')->insert($versions);
            DB::table('educational_course_favorites')->insert($favorites);
        }
        $this->actAs('student-a');
        $overflow = $this->getJson(self::URL)->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable'])->assertDontSee('volume-course');
        self::assertFalse($overflow->headers->has('Content-Disposition'));
        self::assertSame(5001, DB::table('educational_course_favorites')->count());
        $this->deleteJson('/universidade/private/courses/5001/favorite')->assertOk();
        $this->getJson(self::URL)->assertOk()->assertJsonCount(5000, 'favorites')
            ->assertJsonPath('favorites.0.course_slug', 'volume-course-00001')
            ->assertJsonPath('favorites.4999.course_slug', 'volume-course-05000');
    }

    public function test_unavailable_storage_is_not_a_successful_empty_export(): void
    {
        $this->actAs('student-a');
        Schema::drop('educational_course_favorites');
        $response = $this->getJson(self::URL)->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertFalse($response->headers->has('Content-Disposition'));
    }

    public function test_revocation_during_query_does_not_release_a_download_or_delete_history(): void
    {
        $course = $this->course();
        $this->favorite($course);
        $authority = $this->authority;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_favorites')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $response = $this->getJson(self::URL)->assertForbidden()
            ->assertExactJson(['error' => 'access_denied'])->assertDontSee('export-course');
        self::assertTrue($revoked);
        self::assertFalse($response->headers->has('Content-Disposition'));
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_refreshed_identity_permission_revision_and_expiry_must_match(): void
    {
        $course = $this->course();
        $this->favorite($course);
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
            PortalGrant::allow('export-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('export-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
        ] as $replacement) {
            $authority->replacement = null;
            $changed = false;
            $next = $replacement;
            $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertTrue($changed);
        }
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_authority_unavailable_after_read_fails_closed(): void
    {
        $course = $this->course();
        $this->favorite($course);
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains($query->sql, 'educational_course_favorites')) {
                $authority->online = false;
            }
        });
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_final_get_middleware_rechecks_even_after_the_controller_refresh(): void
    {
        $course = $this->course();
        $this->favorite($course);
        $this->authority->checks = 0;
        $this->authority->denyAtCheck = 3;
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(3, $this->authority->checks);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_repository_rejects_unusable_or_editorial_grants(): void
    {
        $repository = $this->app->make(UniversityCatalogRepository::class);
        foreach ([
            PortalGrant::deny(),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
            PortalGrant::allow('export-company-a', 'same-person', PortalAccessGate::VIEW, 0, time() + 30),
            PortalGrant::allow('imagine-editorial', 'export-editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('export-company-a', '../another-person', PortalAccessGate::VIEW, 1, time() + 30),
        ] as $grant) {
            self::assertNull($repository->exportFavorites($grant));
        }
    }
}
