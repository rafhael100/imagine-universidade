<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** Real HTTP, migrations and repository; only the Portal decision is synthetic. */
final class CourseContextFlowTest extends TestCase
{
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
        foreach (['imagine-editorial', 'context-company-a', 'context-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $denyInsideTransaction = false;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $identity = [
                    'editor' => ['imagine-editorial', 'context-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['context-company-a', 'context-person-a', PortalAccessGate::VIEW],
                    'student-b' => ['context-company-b', 'context-person-b', PortalAccessGate::VIEW],
                    'manager-a' => ['context-company-a', 'context-manager-a', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if ($identity === null || $identity[0] !== $companyId || $identity[2] !== $permission
                    || ($this->denyInsideTransaction && DB::transactionLevel() > 0)) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 60);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->asIdentity('editor', 'imagine-editorial');
    }

    private function asIdentity(string $credential, string $company): void
    {
        $this->withSession(['portal_server_credential' => $credential, 'portal_company_id' => $company]);
    }

    private function metadata(array $extra = []): array
    {
        return [...['title' => 'Curso fictício de contexto', 'category' => 'metodologia',
            'summary' => 'Descrição fictícia para conferir orientação editorial.'], ...$extra];
    }

    private function course(array $extra = []): int
    {
        return (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'contexto-'.(++$this->sequence), 'sort_order' => 7, ...$this->metadata($extra),
        ])->assertCreated()->json('id');
    }

    private function url(int $course): string
    {
        return '/universidade/private/admin/courses/'.$course;
    }

    private function lesson(int $course): int
    {
        return (int) $this->postJson($this->url($course).'/lessons', [
            'slug' => 'aula-ficticia', 'title' => 'Aula fictícia autorizada',
            'body' => 'Texto fictício que pode ser lido sem requisito acadêmico.',
        ])->assertCreated()->json('id');
    }

    private function publish(int $course): void
    {
        $check = $this->getJson($this->url($course).'/publication-check')->assertOk()
            ->assertJsonPath('ready', true);
        $this->postJson($this->url($course).'/publish', ['expected_content_hash' => $check->json('content_hash')])
            ->assertOk()->assertExactJson(['published' => true]);
    }

    private function snapshot(): array
    {
        $snapshot = [];
        foreach (['educational_courses', 'educational_course_versions', 'educational_lessons',
            'educational_audit_events', 'educational_lesson_progress', 'educational_course_favorites',
            'educational_reading_positions'] as $table) {
            $snapshot[$table] = DB::table($table)->get()->map(static fn ($row): array => (array) $row)->all();
        }
        return $snapshot;
    }

    public function test_legacy_creation_defaults_to_null_and_legacy_patch_preserves_existing_guidance(): void
    {
        $legacy = $this->course();
        $row = DB::table('educational_courses')->find($legacy);
        self::assertNull($row->audience);
        self::assertNull($row->suggested_knowledge);
        $course = $this->course(['audience' => 'Pessoas que organizam o atendimento.',
            'suggested_knowledge' => 'Familiaridade com a rotina pode ajudar.']);
        $this->patchJson($this->url($course), $this->metadata(['title' => 'Título alterado pelo cliente legado']))
            ->assertOk()->assertExactJson(['saved' => true]);
        $row = DB::table('educational_courses')->find($course);
        self::assertSame('Pessoas que organizam o atendimento.', $row->audience);
        self::assertSame('Familiaridade com a rotina pode ajudar.', $row->suggested_knowledge);
        self::assertSame(7, (int) $row->sort_order);
        $this->getJson('/universidade/private/admin/courses')->assertOk()
            ->assertJsonPath('courses.0.audience', null)->assertJsonPath('courses.0.suggested_knowledge', null)
            ->assertJsonPath('courses.1.audience', $row->audience)
            ->assertJsonPath('courses.1.suggested_knowledge', $row->suggested_knowledge);
    }

    public function test_literal_unicode_guidance_round_trips_and_never_blocks_an_authorized_lesson(): void
    {
        $audience = str_repeat('🧭', 500);
        $knowledge = "Orientação opcional <script>literal</script>.\nConhecer a rotina pode ajudar.";
        $course = $this->course(['audience' => $audience, 'suggested_knowledge' => $knowledge]);
        $lesson = $this->lesson($course);
        $this->getJson('/universidade/private/admin/courses')->assertOk()
            ->assertJsonPath('courses.0.audience', $audience)
            ->assertJsonPath('courses.0.suggested_knowledge', $knowledge);
        $this->asIdentity('student-a', 'context-company-a');
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(0, 'courses');
        $this->asIdentity('editor', 'imagine-editorial');
        $this->publish($course);
        $before = $this->snapshot();
        foreach (['a', 'b'] as $company) {
            $this->asIdentity('student-'.$company, 'context-company-'.$company);
            $response = $this->getJson('/universidade/private/courses')->assertOk()
                ->assertJsonPath('courses.0.audience', $audience)
                ->assertJsonPath('courses.0.suggested_knowledge', $knowledge)
                ->assertJsonPath('courses.0.lessons_completed', 0);
            self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
            $this->getJson('/universidade/private/lessons/'.$lesson)->assertOk()
                ->assertJsonPath('lesson.id', $lesson);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_each_optional_field_can_be_replaced_or_cleared_without_resetting_the_other(): void
    {
        $course = $this->course(['audience' => 'Público original.', 'suggested_knowledge' => 'Contexto original.']);
        $this->patchJson($this->url($course), $this->metadata(['audience' => null]))->assertOk();
        $row = DB::table('educational_courses')->find($course);
        self::assertNull($row->audience);
        self::assertSame('Contexto original.', $row->suggested_knowledge);
        $this->patchJson($this->url($course), $this->metadata([
            'audience' => 'Público revisto.', 'suggested_knowledge' => '   ',
        ]))->assertOk()->assertExactJson(['saved' => true]);
        $row = DB::table('educational_courses')->find($course);
        self::assertSame('Público revisto.', $row->audience);
        self::assertNull($row->suggested_knowledge);
        self::assertSame(7, (int) $row->sort_order);
        self::assertSame(2, DB::table('educational_audit_events')->where('action', 'course.updated')->count());
    }

    public function test_invalid_types_and_overlong_unicode_do_not_create_or_change_courses(): void
    {
        $course = $this->course(['audience' => 'Público preservado.', 'suggested_knowledge' => 'Contexto preservado.']);
        $before = $this->snapshot();
        foreach (['audience', 'suggested_knowledge'] as $field) {
            foreach ([[], ['text' => 'forjado'], true, 1, str_repeat('🧭', 501)] as $invalid) {
                $this->postJson('/universidade/private/admin/courses', [
                    'slug' => 'entrada-invalida', ...$this->metadata([$field => $invalid]),
                ])->assertUnprocessable()->assertJsonValidationErrors([$field]);
                $this->patchJson($this->url($course), $this->metadata([$field => $invalid]))
                    ->assertUnprocessable()->assertJsonValidationErrors([$field]);
                self::assertSame($before, $this->snapshot());
            }
        }
    }

    public function test_both_guidance_fields_participate_in_the_locked_publication_check(): void
    {
        $course = $this->course(['audience' => 'Público original.', 'suggested_knowledge' => 'Contexto original.']);
        $this->lesson($course);
        foreach (['audience', 'suggested_knowledge'] as $field) {
            $oldHash = $this->getJson($this->url($course).'/publication-check')->assertOk()->json('content_hash');
            $this->patchJson($this->url($course), $this->metadata([$field => 'Orientação revisada: '.$field]))->assertOk();
            $before = $this->snapshot();
            $this->postJson($this->url($course).'/publish', ['expected_content_hash' => $oldHash])
                ->assertStatus(409)->assertExactJson(['error' => 'missing_lesson_or_changed_draft']);
            self::assertSame($before, $this->snapshot());
            $newHash = $this->getJson($this->url($course).'/publication-check')->assertOk()->json('content_hash');
            self::assertNotSame($oldHash, $newHash);
        }
        $this->publish($course);
        self::assertSame(1, DB::table('educational_audit_events')->where('action', 'course.published')->count());
    }

    public function test_published_guidance_is_immutable_until_withdrawal_and_stays_current_course_metadata(): void
    {
        $course = $this->course(['audience' => 'Público inicial.', 'suggested_knowledge' => 'Contexto inicial.']);
        $lesson = $this->lesson($course);
        $this->publish($course);
        $before = $this->snapshot();
        $this->patchJson($this->url($course), $this->metadata(['audience' => 'Mudança não permitida.']))
            ->assertNotFound();
        self::assertSame($before, $this->snapshot());
        $this->postJson($this->url($course).'/unpublish')->assertOk()->assertExactJson(['published' => false]);
        $archived = (array) DB::table('educational_lessons')->find($lesson);
        $this->patchJson($this->url($course), $this->metadata(['audience' => 'Público do cadastro atual.']))->assertOk();
        self::assertSame($archived, (array) DB::table('educational_lessons')->find($lesson));
        $this->getJson('/universidade/private/admin/courses')->assertOk()
            ->assertJsonPath('courses.0.audience', 'Público do cadastro atual.')
            ->assertJsonPath('courses.0.suggested_knowledge', 'Contexto inicial.');
        $this->asIdentity('student-a', 'context-company-a');
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(0, 'courses');
        $this->getJson('/universidade/private/lessons/'.$lesson)->assertNotFound();
    }

    public function test_authority_and_editorial_scope_still_control_metadata_writes(): void
    {
        $course = $this->course(['audience' => 'Público preservado.']);
        $before = $this->snapshot();
        $this->asIdentity('student-a', 'context-company-a');
        $this->patchJson($this->url($course), $this->metadata(['audience' => 'Não autorizado.']))->assertForbidden();
        $this->asIdentity('manager-a', 'context-company-a');
        $this->patchJson($this->url($course), $this->metadata(['audience' => 'Empresa sem autoridade editorial.']))->assertNotFound();
        self::assertSame($before, $this->snapshot());
        $this->asIdentity('editor', 'imagine-editorial');
        $this->authority->denyInsideTransaction = true;
        $this->patchJson($this->url($course), $this->metadata(['audience' => 'Revogado antes da escrita.']))->assertNotFound();
        $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'revogado', ...$this->metadata(['audience' => 'Revogado antes da criação.']),
        ])->assertNotFound();
        self::assertSame($before, $this->snapshot());
    }

    public function test_guidance_does_not_expand_search_or_personal_export_payloads(): void
    {
        $course = $this->course(['audience' => 'Expressaounicadecontexto', 'suggested_knowledge' => 'Orientação opcional.']);
        $this->lesson($course);
        $this->publish($course);
        $this->asIdentity('student-a', 'context-company-a');
        $before = $this->snapshot();
        $this->postJson('/universidade/private/search', ['query' => 'Expressaounicadecontexto'])
            ->assertOk()->assertExactJson(['results' => []]);
        $this->getJson('/universidade/private/progress/export')->assertOk()->assertDontSee('audience')
            ->assertDontSee('suggested_knowledge')->assertDontSee('Expressaounicadecontexto');
        $this->getJson('/universidade/private/favorites/export')->assertOk()->assertDontSee('audience')
            ->assertDontSee('suggested_knowledge')->assertDontSee('Expressaounicadecontexto');
        self::assertSame($before, $this->snapshot());
    }

    public function test_additive_migration_preserves_existing_courses_and_its_rollback_leaves_the_catalogue(): void
    {
        $migration = require database_path('migrations/2026_11_18_000001_add_optional_course_context.php');
        $migration->down();
        $now = now();
        $course = DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->value('id'),
            'slug' => 'anterior-a-migracao', 'title' => 'Curso anterior à migração', 'category' => 'metodologia',
            'summary' => 'Descrição preservada.', 'sort_order' => 9, 'is_shared' => true, 'is_published' => false,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $before = (array) DB::table('educational_courses')->find($course);
        $migration->up();
        $row = (array) DB::table('educational_courses')->find($course);
        self::assertSame([...$before, 'audience' => null, 'suggested_knowledge' => null], $row);
        $migration->down();
        self::assertFalse(Schema::hasColumn('educational_courses', 'audience'));
        self::assertFalse(Schema::hasColumn('educational_courses', 'suggested_knowledge'));
        self::assertSame($before, (array) DB::table('educational_courses')->find($course));
        $migration->up();
    }
}
