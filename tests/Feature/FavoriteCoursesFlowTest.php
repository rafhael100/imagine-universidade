<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Actual Laravel/database flows with test-only Portal decisions. No SSO/provider is enabled. */
final class FavoriteCoursesFlowTest extends TestCase
{
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

        foreach (['imagine-editorial', 'favorite-company-a', 'favorite-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public bool $online = true;
            public int $checksInsideTransaction = 0;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                if (DB::transactionLevel() > 0) {
                    $this->checksInsideTransaction++;
                }
                if (!$this->online) {
                    throw new RuntimeException('Synthetic authority unavailable');
                }
                $identities = [
                    'editor' => ['imagine-editorial', 'favorite-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['favorite-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['favorite-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['favorite-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['favorite-company-a', 'same-person', PortalAccessGate::MANAGE],
                ];
                $identity = $identities[$credential] ?? null;
                if (!$this->active || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
    }

    private function actAs(string $identity): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial',
            'student-b' => 'favorite-company-b',
            default => 'favorite-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function course(bool $publish = true): int
    {
        $this->actAs('editor');
        $number = ++$this->courseSequence;
        $id = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'favorite-course-'.$number, 'title' => 'Curso para favoritos '.$number,
            'category' => 'metodologia',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$id}/lessons", [
            'slug' => 'first-lesson', 'title' => 'Primeira aula',
            'body' => 'Conteúdo editorial sintético usado somente na verificação.',
        ])->assertCreated();
        if ($publish) {
            $this->postJson("/universidade/private/admin/courses/{$id}/publish")->assertOk();
        }
        return $id;
    }

    private function organization(string $key = 'favorite-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function grant(): PortalGrant
    {
        return PortalGrant::allow('favorite-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
    }

    public function test_favorites_are_private_to_each_company_and_person(): void
    {
        $course = $this->course();
        foreach (['student-a', 'student-b', 'colleague-a'] as $identity) {
            $this->actAs($identity);
            $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => []]);
            $this->putJson("/universidade/private/courses/{$course}/favorite", [
                'company_id' => 'forged-company', 'subject_key' => 'forged-person',
            ])->assertOk()->assertExactJson(['course_id' => $course, 'favorite' => true]);
        }
        self::assertSame(3, DB::table('educational_course_favorites')->count());
        self::assertSame(0, DB::table('educational_course_favorites')->where('subject_key', 'forged-person')->count());

        $this->actAs('student-a');
        $this->deleteJson("/universidade/private/courses/{$course}/favorite", [
            'company_id' => 'favorite-company-b', 'subject_key' => 'another-person',
        ])->assertOk()->assertExactJson(['course_id' => $course, 'favorite' => false]);
        $this->getJson('/universidade/private/favorites?company_id=favorite-company-b&subject_key=another-person')
            ->assertOk()->assertExactJson(['course_ids' => []]);
        foreach (['student-b', 'colleague-a'] as $identity) {
            $this->actAs($identity);
            $response = $this->getJson('/universidade/private/favorites')->assertOk()
                ->assertExactJson(['course_ids' => [$course]]);
            self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        }
        self::assertSame(2, DB::table('educational_course_favorites')->count());
    }

    public function test_favorite_put_is_idempotent_and_returns_unique_ordered_integer_ids(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$second}/favorite")->assertOk();
        $this->putJson("/universidade/private/courses/{$first}/favorite")->assertOk();
        $before = (array) DB::table('educational_course_favorites')->where('educational_course_id', $first)->first();
        $this->travel(2)->seconds();
        $this->putJson("/universidade/private/courses/{$first}/favorite")->assertOk()
            ->assertExactJson(['course_id' => $first, 'favorite' => true]);
        $this->travelBack();
        self::assertSame($before, (array) DB::table('educational_course_favorites')->where('educational_course_id', $first)->first());
        self::assertSame(2, DB::table('educational_course_favorites')->count());
        $this->getJson('/universidade/private/favorites')->assertOk()
            ->assertExactJson(['course_ids' => [$first, $second]]);
    }

    public function test_withdrawn_favorites_are_hidden_retained_and_removable_idempotently(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->actAs('student-a');
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => []]);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertNotFound();
        foreach ([$course, $course, 999999] as $id) {
            $this->deleteJson("/universidade/private/courses/{$id}/favorite")->assertOk()
                ->assertExactJson(['course_id' => $id, 'favorite' => false]);
        }
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_republication_restores_favorite_and_creation_age_is_not_loss_of_eligibility(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        DB::table('educational_course_favorites')->update([
            'created_at' => now()->subDays(121), 'updated_at' => now()->subDays(121),
        ]);
        $this->actAs('editor');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->actAs('student-a');
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => [$course]]);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_draft_nonshared_foreign_and_missing_published_version_cannot_be_favorited_or_listed(): void
    {
        $published = $this->course();
        $draft = $this->course(false);
        $private = $this->course();
        DB::table('educational_courses')->where('id', $private)->update(['is_shared' => false]);
        $foreign = $this->course();
        DB::table('educational_courses')->where('id', $foreign)->update([
            'educational_organization_id' => $this->organization(),
        ]);
        $withoutVersion = $this->course();
        DB::table('educational_course_versions')->where('educational_course_id', $withoutVersion)
            ->update(['status' => 'archived']);
        $this->actAs('student-a');
        foreach ([$draft, $private, $foreign, $withoutVersion, 999999, 0] as $id) {
            $this->putJson("/universidade/private/courses/{$id}/favorite")->assertNotFound();
        }
        self::assertSame(0, DB::table('educational_course_favorites')->count());

        // Read filters also protect pre-existing rows after publication/ownership changes.
        foreach ([$published, $draft, $private, $foreign, $withoutVersion] as $id) {
            DB::table('educational_course_favorites')->insert([
                'educational_organization_id' => $this->organization(), 'subject_key' => 'same-person',
                'educational_course_id' => $id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => [$published]]);
    }

    public function test_editor_or_manager_cannot_browse_or_change_students_favorites(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        foreach (['editor', 'manager-a'] as $identity) {
            $this->actAs($identity);
            $this->getJson('/universidade/private/favorites')->assertForbidden();
            $this->putJson("/universidade/private/courses/{$course}/favorite")->assertForbidden();
            $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertForbidden();
        }
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_default_authority_and_forged_browser_identity_never_authorize_favorites(): void
    {
        $headers = ['X-Company-Id' => 'favorite-company-a', 'X-Portal-Grant' => 'true'];
        $this->getJson('/universidade/private/favorites?company_id=favorite-company-a', $headers)->assertForbidden();
        $this->putJson('/universidade/private/courses/1/favorite', ['subject_key' => 'same-person'], $headers)->assertForbidden();
        $this->deleteJson('/universidade/private/courses/1/favorite', [], $headers)->assertForbidden();
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->actAs('student-a');
        $this->getJson('/universidade/private/favorites')->assertForbidden();
        $this->putJson('/universidade/private/courses/1/favorite')->assertForbidden();
        $this->deleteJson('/universidade/private/courses/1/favorite')->assertForbidden();
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_revocation_during_favorite_write_is_checked_inside_the_transaction(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $authority = $this->authority;
        $before = $authority->checksInsideTransaction;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_versions')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertNotFound();
        self::assertTrue($revoked);
        self::assertGreaterThan($before, $authority->checksInsideTransaction);
        self::assertSame(0, DB::table('educational_course_favorites')->count());
    }

    public function test_revocation_during_removal_preserves_the_students_preference(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $authority = $this->authority;
        $before = $authority->checksInsideTransaction;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_favorites')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertForbidden();
        self::assertTrue($revoked);
        self::assertGreaterThan($before, $authority->checksInsideTransaction);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_revocation_during_favorite_read_does_not_release_ids(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $authority = $this->authority;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_favorites')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->getJson('/universidade/private/favorites')->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($revoked);
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_live_grant_must_match_for_add_remove_and_absent_removal(): void
    {
        $course = $this->course();
        $grant = $this->grant();
        $repository = $this->app->make(UniversityCatalogRepository::class);
        self::assertFalse($repository->favoriteCourse($grant, $course));
        self::assertFalse($repository->unfavoriteCourse($grant, $course));
        $wrong = [
            null, PortalGrant::deny('revoked'),
            PortalGrant::allow('favorite-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('favorite-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('favorite-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('favorite-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30),
            PortalGrant::allow('favorite-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
        ];
        foreach ($wrong as $fresh) {
            self::assertFalse($repository->favoriteCourse($grant, $course, static fn () => $fresh));
            self::assertFalse($repository->unfavoriteCourse($grant, $course, static fn () => $fresh));
        }
        $unavailable = static function (): PortalGrant { throw new RuntimeException('Synthetic failure'); };
        self::assertFalse($repository->favoriteCourse($grant, $course, $unavailable));
        self::assertSame(0, DB::table('educational_course_favorites')->count());
        self::assertTrue($repository->favoriteCourse($grant, $course, static fn () => $grant));
        foreach ($wrong as $fresh) {
            self::assertFalse($repository->unfavoriteCourse($grant, $course, static fn () => $fresh));
        }
        self::assertFalse($repository->unfavoriteCourse($grant, $course, $unavailable));
        self::assertSame(1, DB::table('educational_course_favorites')->count());
    }

    public function test_last_service_loss_denies_access_without_deleting_favorite_history(): void
    {
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $this->authority->active = false;
        $this->getJson('/universidade/private/favorites')->assertForbidden();
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertForbidden();
        $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertForbidden();
        self::assertSame(1, DB::table('educational_course_favorites')->count());
        $this->authority->active = true;
        $this->getJson('/universidade/private/favorites')->assertOk()->assertExactJson(['course_ids' => [$course]]);
    }

    public function test_schema_is_minimal_and_rejects_duplicate_private_keys(): void
    {
        $columns = Schema::getColumnListing('educational_course_favorites');
        sort($columns);
        self::assertSame(['created_at', 'educational_course_id', 'educational_organization_id', 'subject_key', 'updated_at'], $columns);
        $course = $this->course();
        $this->actAs('student-a');
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertOk();
        $row = (array) DB::table('educational_course_favorites')->first();
        try {
            DB::table('educational_course_favorites')->insert($row);
            self::fail('A duplicate private favorite must fail at the database boundary.');
        } catch (QueryException) {
            self::assertSame(1, DB::table('educational_course_favorites')->count());
        }
    }

    public function test_unavailable_storage_is_not_an_empty_favorite_list_or_successful_mutation(): void
    {
        $course = $this->course();
        Schema::drop('educational_course_favorites');
        $this->actAs('student-a');
        $this->getJson('/universidade/private/favorites')->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
        $this->putJson("/universidade/private/courses/{$course}/favorite")->assertStatus(503);
        $this->deleteJson("/universidade/private/courses/{$course}/favorite")->assertStatus(503);
    }
}
