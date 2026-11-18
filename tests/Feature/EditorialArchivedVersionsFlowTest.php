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

/** Real HTTP, migrations and queries; only Portal decisions are synthetic. */
final class EditorialArchivedVersionsFlowTest extends TestCase
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
        foreach (['imagine-editorial', 'archive-client'] as $key) {
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
                $identity = [
                    'editor' => ['imagine-editorial', 'archive-editor', PortalAccessGate::MANAGE],
                    'student' => ['archive-client', 'archive-student', PortalAccessGate::VIEW],
                    'manager' => ['archive-client', 'archive-manager', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return $this->replacement
                    ?? PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->actAs();
    }

    private function actAs(string $identity = 'editor'): void
    {
        $this->withSession(['portal_server_credential' => $identity,
            'portal_company_id' => $identity === 'editor' ? 'imagine-editorial' : 'archive-client']);
    }

    private function course(string $owner = 'imagine-editorial', bool $shared = true): int
    {
        return (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => DB::table('educational_organizations')->where('synthetic_key', $owner)->value('id'),
            'slug' => 'archive-course-'.++$this->courseSequence, 'title' => 'Cadastro atual do curso',
            'summary' => 'Descrição atual, sem snapshot histórico.', 'category' => 'metodologia',
            'is_shared' => $shared, 'is_published' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /** @return array{id:int,lessons:list<int>} */
    private function version(int $course, int $number, string $status = 'archived', int $count = 1): array
    {
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => $number, 'status' => $status,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $lessons = [];
        for ($index = 0; $index < $count; $index++) {
            $lessons[] = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version, 'slug' => 'lesson-'.$index,
                'title' => 'Título histórico '.$index, 'body' => 'Texto histórico integral da versão '.$number.'.',
                'sort_order' => intdiv($index, 4), 'is_published' => $status === 'published',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return ['id' => $version, 'lessons' => $lessons];
    }

    private function base(int $course): string
    {
        return '/universidade/private/admin/courses/'.$course.'/versions';
    }

    private function envelope(int $course): array
    {
        return ['schema_version' => 1, 'scope' => 'editorial_archived_content', 'course_id' => $course];
    }

    private function grant(): PortalGrant
    {
        return PortalGrant::allow('imagine-editorial', 'archive-editor', PortalAccessGate::MANAGE, 1, time() + 30);
    }

    public function test_current_draft_and_published_versions_are_not_archived_history(): void
    {
        $course = $this->course();
        $draft = $this->version($course, 1, 'draft');
        $empty = [...$this->envelope($course), 'versions' => [], 'next_before_version' => null];
        $this->getJson($this->base($course))->assertOk()->assertExactJson($empty);
        $this->getJson($this->base($course).'/1/lessons')->assertNotFound();
        $this->getJson($this->base($course).'/1/lessons/'.$draft['lessons'][0])->assertNotFound();
        DB::table('educational_course_versions')->where('id', $draft['id'])->update(['status' => 'published']);
        DB::table('educational_courses')->where('id', $course)->update(['is_published' => true]);
        $this->getJson($this->base($course))->assertOk()->assertExactJson($empty);
        $this->getJson($this->base($course).'/1/lessons')->assertNotFound();
    }

    public function test_real_publication_withdrawal_and_later_edits_preserve_historical_lesson_fields_only(): void
    {
        $course = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'real-archive-course', 'title' => 'Título original do cadastro',
            'category' => 'metodologia', 'summary' => 'Descrição original do cadastro.',
        ])->assertCreated()->json('id');
        $lesson = (int) $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'original-lesson', 'title' => 'Aula original', 'body' => 'Corpo original mantido na versão arquivada.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->patchJson("/universidade/private/admin/courses/{$course}", [
            'title' => 'Cadastro atual alterado', 'category' => 'negocios', 'summary' => 'Descrição atual alterada.',
        ])->assertOk();
        $draftLesson = (int) DB::table('educational_lessons as l')->join('educational_course_versions as v',
            'v.id', '=', 'l.educational_course_version_id')->where('v.educational_course_id', $course)
            ->where('v.status', 'draft')->value('l.id');
        $this->patchJson('/universidade/private/admin/lessons/'.$draftLesson, [
            'title' => 'Nova aula atual', 'body' => 'Texto novo que não deve substituir o histórico.',
        ])->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->getJson($this->base($course))->assertOk()->assertExactJson([
            ...$this->envelope($course), 'versions' => [['version' => 1, 'status' => 'archived', 'lesson_count' => 1]],
            'next_before_version' => null,
        ])->assertDontSee('Cadastro atual')->assertDontSee('Descrição');
        $this->getJson($this->base($course).'/1/lessons/'.$lesson)->assertOk()->assertExactJson([
            ...$this->envelope($course), 'course_version' => 1, 'status' => 'archived',
            'lesson' => ['id' => $lesson, 'slug' => 'original-lesson', 'title' => 'Aula original',
                'body' => 'Corpo original mantido na versão arquivada.', 'sort_order' => 0],
        ])->assertDontSee('Cadastro atual')->assertDontSee('Texto novo');
        $this->actAs('student');
        $this->getJson('/universidade/private/lessons/'.$lesson)->assertNotFound();
        $this->getJson($this->base($course).'/1/lessons/'.$lesson)->assertForbidden();
    }

    public function test_version_route_uses_the_exact_course_version_number_and_detail_is_triple_bound(): void
    {
        $other = $this->course();
        $otherVersion = $this->version($other, 7);
        $course = $this->course();
        $v7 = $this->version($course, 7);
        $v8 = $this->version($course, 8);
        self::assertNotSame(7, $v7['id']);
        $this->getJson($this->base($course).'/7/lessons/'.$v7['lessons'][0])->assertOk()->assertJsonPath('course_version', 7);
        foreach ([
            $this->base($course).'/'.$v7['id'].'/lessons',
            $this->base($course).'/7/lessons/'.$v8['lessons'][0],
            $this->base($course).'/7/lessons/'.$otherVersion['lessons'][0],
            $this->base($other).'/7/lessons/'.$v7['lessons'][0],
        ] as $url) {
            $this->getJson($url)->assertNotFound()->assertExactJson(['error' => 'not_found']);
        }
    }

    public function test_versions_use_fifty_plus_sentinel_keyset_pages_without_current_versions_or_duplicates(): void
    {
        $course = $this->course();
        for ($number = 1; $number <= 55; $number++) {
            $this->version($course, $number, 'archived', $number === 55 ? 3 : 0);
        }
        $this->version($course, 56, 'draft', 4);
        $first = $this->getJson($this->base($course))->assertOk()->assertJsonCount(50, 'versions')->json();
        self::assertSame(range(55, 6), array_column($first['versions'], 'version'));
        self::assertSame(3, $first['versions'][0]['lesson_count']);
        self::assertSame(0, $first['versions'][1]['lesson_count']);
        self::assertSame(6, $first['next_before_version']);
        // A later archived version must not shift older keyset pages.
        $this->version($course, 57, 'archived', 0);
        $last = $this->getJson($this->base($course).'?before_version=6')->assertOk()
            ->assertJsonCount(5, 'versions')->assertJsonPath('next_before_version', null)->json();
        self::assertSame(range(5, 1), array_column($last['versions'], 'version'));
        self::assertCount(55, array_unique(array_column([...$first['versions'], ...$last['versions']], 'version')));
        $this->getJson($this->base($course))->assertOk()->assertJsonPath('versions.0.version', 57);
        $this->getJson($this->base($course).'?before_version=1')->assertOk()->assertJsonCount(0, 'versions')
            ->assertJsonPath('next_before_version', null);
    }

    public function test_exactly_fifty_versions_or_lessons_do_not_invent_a_next_page(): void
    {
        $course = $this->course();
        for ($number = 1; $number <= 50; $number++) {
            $this->version($course, $number, 'archived', $number === 50 ? 50 : 0);
        }
        $this->getJson($this->base($course))->assertOk()->assertJsonCount(50, 'versions')
            ->assertJsonPath('next_before_version', null);
        $this->getJson($this->base($course).'/50/lessons')->assertOk()->assertJsonCount(50, 'lessons')
            ->assertJsonPath('next_after', null);
    }

    public function test_lesson_pages_preserve_equal_sort_order_ties_and_never_include_bodies(): void
    {
        $course = $this->course();
        $version = $this->version($course, 3, 'archived', 55);
        $first = $this->getJson($this->base($course).'/3/lessons')->assertOk()->assertJsonCount(50, 'lessons')->json();
        self::assertSame(['id', 'slug', 'title', 'sort_order'], array_keys($first['lessons'][0]));
        self::assertSame(['sort_order' => 12, 'lesson_id' => $version['lessons'][49]], $first['next_after']);
        $second = $this->getJson($this->base($course).'/3/lessons?after_sort_order=12&after_lesson_id='.$version['lessons'][49])
            ->assertOk()->assertJsonCount(5, 'lessons')->assertJsonPath('next_after', null)->json();
        self::assertSame(12, $second['lessons'][0]['sort_order']);
        self::assertSame($version['lessons'], array_column([...$first['lessons'], ...$second['lessons']], 'id'));
        self::assertStringNotContainsString('Texto histórico integral', json_encode($first, JSON_THROW_ON_ERROR));
        $this->getJson($this->base($course).'/3/lessons/'.$version['lessons'][50])->assertOk()
            ->assertJsonPath('lesson.body', 'Texto histórico integral da versão 3.');
    }

    public function test_empty_archived_version_is_a_valid_empty_page(): void
    {
        $course = $this->course();
        $this->version($course, 1, 'archived', 0);
        $this->getJson($this->base($course).'/1/lessons')->assertOk()->assertExactJson([
            ...$this->envelope($course), 'course_version' => 1, 'status' => 'archived',
            'lessons' => [], 'next_after' => null,
        ]);
        $this->getJson($this->base($course).'/1/lessons/99999')->assertNotFound();
    }

    public function test_cursors_require_valid_shape_and_an_anchor_in_the_exact_archived_scope(): void
    {
        $course = $this->course();
        $v1 = $this->version($course, 1, 'archived', 2);
        $v2 = $this->version($course, 2);
        $this->version($course, 3, 'draft');
        $other = $this->course();
        $this->version($other, 4);
        foreach (['before_version=0', 'before_version=-1', 'before_version=text', 'before_version[]=1',
            'before_version=9007199254740992', 'before_version=2147483648',
            'before_version=3', 'before_version=4', 'before_version=999',
        ] as $query) {
            $this->getJson($this->base($course).'?'.$query)->assertStatus(422)->assertExactJson(['error' => 'invalid_cursor']);
        }
        foreach (['after_sort_order=0', 'after_lesson_id='.$v1['lessons'][0],
            'after_sort_order=-1&after_lesson_id='.$v1['lessons'][0],
            'after_sort_order=1&after_lesson_id='.$v1['lessons'][0],
            'after_sort_order=0&after_lesson_id='.$v2['lessons'][0],
            'after_sort_order=0&after_lesson_id=999999', 'after_sort_order[]=0&after_lesson_id=1',
            'after_sort_order=2147483648&after_lesson_id='.$v1['lessons'][0],
            'after_sort_order=0&after_lesson_id=9007199254740992',
        ] as $query) {
            $this->getJson($this->base($course).'/1/lessons?'.$query)->assertStatus(422)
                ->assertExactJson(['error' => 'invalid_cursor']);
        }
    }

    public function test_foreign_nonshared_and_missing_courses_do_not_trigger_historical_queries(): void
    {
        $foreign = $this->course('archive-client');
        $private = $this->course('imagine-editorial', false);
        $foreignVersion = $this->version($foreign, 1);
        $privateVersion = $this->version($private, 1);
        $historyReads = [];
        DB::listen(static function (QueryExecuted $query) use (&$historyReads): void {
            if (str_contains($query->sql, 'educational_course_versions') || str_contains($query->sql, 'educational_lessons')) {
                $historyReads[] = $query->sql;
            }
        });
        foreach ([[$foreign, $foreignVersion['lessons'][0]], [$private, $privateVersion['lessons'][0]], [999999, 999999]] as [$course, $lesson]) {
            foreach ([$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$lesson] as $url) {
                $this->getJson($url)->assertNotFound()->assertExactJson(['error' => 'not_found']);
            }
        }
        self::assertSame([], $historyReads);
    }

    public function test_only_the_editorial_manage_grant_can_read_and_forged_inputs_do_not_widen_scope(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $urls = [$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$version['lessons'][0]];
        foreach (['student', 'manager', 'unknown'] as $identity) {
            $this->actAs($identity);
            foreach ($urls as $url) {
                $this->withHeaders(['X-Company-Id' => 'imagine-editorial', 'X-Permission' => PortalAccessGate::MANAGE])
                    ->getJson($url.'?company_id=imagine-editorial&permission=university:manage')->assertForbidden();
            }
        }
        $this->actAs();
        $this->getJson($urls[0].'?company_id=archive-client')->assertOk()->assertJsonPath('course_id', $course);
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson($urls[0])->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }

    public function test_route_ranges_are_rejected_before_integer_overflow_or_database_lookup(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        foreach (['/universidade/private/admin/courses/9007199254740992/versions',
            $this->base($course).'/99999999999999999999999/lessons',
            $this->base($course).'/2147483648/lessons',
            $this->base($course).'/2147483648/lessons/'.$version['lessons'][0],
            $this->base($course).'/1/lessons/9007199254740992',
            $this->base($course).'/0/lessons/'.$version['lessons'][0],
        ] as $url) {
            $this->getJson($url)->assertNotFound()->assertExactJson(['error' => 'not_found']);
        }
    }

    public function test_utf8_codepoint_limits_accept_full_historical_text_without_slicing(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $title = str_repeat('🌱', 200);
        $body = str_repeat('🌱', 30000);
        DB::table('educational_lessons')->where('id', $version['lessons'][0])->update(['title' => $title, 'body' => $body]);
        $this->getJson($this->base($course).'/1/lessons')->assertOk()->assertJsonPath('lessons.0.title', $title);
        $this->getJson($this->base($course).'/1/lessons/'.$version['lessons'][0])->assertOk()
            ->assertJsonPath('lesson.title', $title)->assertJsonPath('lesson.body', $body);
    }

    public function test_invalid_or_excessive_stored_fields_fail_without_partial_content(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $id = $version['lessons'][0];
        foreach ([['title' => str_repeat('x', 201)], ['title' => 'Valid title', 'sort_order' => -1],
            ['sort_order' => 0, 'slug' => 'invalid slug'],
        ] as $changes) {
            DB::table('educational_lessons')->where('id', $id)->update($changes);
            $this->getJson($this->base($course).'/1/lessons')->assertStatus(503)
                ->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_lessons')->where('id', $id)->update(['slug' => 'valid-lesson', 'body' => str_repeat('x', 30001)]);
        $this->getJson($this->base($course).'/1/lessons/'.$id)->assertStatus(503)
            ->assertExactJson(['error' => 'temporarily_unavailable']);
        DB::table('educational_course_versions')->where('id', $version['id'])->update(['version' => 0]);
        $this->getJson($this->base($course))->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_reads_query_no_personal_tables_and_perform_no_business_mutations(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $unexpected = [];
        DB::listen(static function (QueryExecuted $query) use (&$unexpected): void {
            if (preg_match('/^\s*(insert|update|delete|alter|create|drop)/i', $query->sql)
                || preg_match('/educational_(lesson_progress|course_favorites|reading_positions|audit_events)/', $query->sql)) {
                $unexpected[] = $query->sql;
            }
        });
        foreach ([$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$version['lessons'][0]] as $url) {
            $response = $this->getJson($url)->assertOk()->assertDontSee('actor_key')->assertDontSee('subject_key');
            self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        }
        self::assertSame([], $unexpected);
    }

    public function test_indices_do_not_select_full_lesson_bodies(): void
    {
        $course = $this->course();
        $this->version($course, 1, 'archived', 2);
        $queries = [];
        DB::listen(static function (QueryExecuted $query) use (&$queries): void {
            if (str_contains($query->sql, 'educational_lessons')) {
                $queries[] = $query->sql;
            }
        });
        $this->getJson($this->base($course))->assertOk();
        $this->getJson($this->base($course).'/1/lessons')->assertOk();
        self::assertNotEmpty($queries);
        foreach ($queries as $sql) {
            self::assertStringNotContainsString('body', $sql);
        }
    }

    public function test_revocation_during_each_history_read_withholds_the_entire_response(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $authority = $this->authority;
        $armed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && (str_contains($query->sql, 'educational_course_versions') || str_contains($query->sql, 'educational_lessons'))) {
                $armed = false;
                $authority->active = false;
            }
        });
        foreach ([$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$version['lessons'][0]] as $url) {
            $authority->active = true;
            $armed = true;
            $this->getJson($url)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertFalse($armed);
        }
    }

    public function test_changed_subject_permission_revision_or_company_after_query_is_denied(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $authority = $this->authority;
        $armed = false;
        $replacement = null;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed, &$replacement): void {
            if ($armed && str_contains($query->sql, 'educational_course_versions')) {
                $armed = false;
                $authority->replacement = $replacement;
            }
        });
        foreach ([
            PortalGrant::allow('archive-client', 'archive-editor', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'other-editor', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'archive-editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'archive-editor', PortalAccessGate::MANAGE, 2, time() + 30),
        ] as $next) {
            $authority->replacement = null;
            $replacement = $next;
            $armed = true;
            $this->getJson($this->base($course).'/1/lessons/'.$version['lessons'][0])->assertForbidden()
                ->assertExactJson(['error' => 'access_denied']);
        }
    }

    public function test_final_get_middleware_rechecks_after_controller_success(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        foreach ([$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$version['lessons'][0]] as $url) {
            $this->authority->checks = 0;
            $this->authority->denyAtCheck = 3;
            $this->getJson($url)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertSame(3, $this->authority->checks);
        }
    }

    public function test_database_failure_and_missing_editorial_organization_are_not_empty_history(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        Schema::drop('educational_lessons');
        foreach ([$this->base($course), $this->base($course).'/1/lessons', $this->base($course).'/1/lessons/'.$version['lessons'][0]] as $url) {
            $this->getJson($url)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->update(['synthetic_key' => 'missing-editorial']);
        $this->getJson($this->base($course))->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
    }

    public function test_authority_failure_after_database_failure_still_denies_the_response(): void
    {
        $course = $this->course();
        $this->version($course, 1);
        $authority = $this->authority;
        $thrown = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$thrown): void {
            if (!$thrown && str_contains($query->sql, 'educational_course_versions')) {
                $thrown = true;
                $authority->online = false;
                throw new RuntimeException('Synthetic database result failure');
            }
        });
        $this->getJson($this->base($course))->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($thrown);
    }

    public function test_internal_repository_requires_editorial_manage_and_valid_route_ranges(): void
    {
        $course = $this->course();
        $version = $this->version($course, 1);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        foreach ([PortalGrant::deny(),
            PortalGrant::allow('archive-client', 'manager', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::MANAGE, 1, time() - 1),
        ] as $grant) {
            self::assertSame('access_denied', $repository->archivedVersions($grant, $course));
            self::assertSame('access_denied', $repository->archivedLessons($grant, $course, 1));
            self::assertSame('access_denied', $repository->archivedLesson($grant, $course, 1, $version['lessons'][0]));
        }
        self::assertSame('not_found', $repository->archivedLessons($this->grant(), $course, -1));
        self::assertSame('not_found', $repository->archivedLessons($this->grant(), $course, 9007199254740992));
    }
}
