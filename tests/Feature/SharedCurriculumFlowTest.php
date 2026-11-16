<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Integração SINTÉTICA futura: requer pdo_sqlite e Composer no sandbox.
 * Nenhum grant de produção ou sessão real do Portal é utilizado.
 */
final class SharedCurriculumFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');

        $this->artisan('migrate:fresh')->assertExitCode(0);

        $now = now();
        foreach (['imagine-editorial', 'synthetic-company-a', 'synthetic-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $this->app->instance(PortalAuthority::class, new class implements PortalAuthority {
            public function verify(string $serverSessionCredential, string $companyId, string $permission): PortalGrant
            {
                $sessions = [
                    'demo-editor' => ['imagine-editorial', 'synthetic-editor', PortalAccessGate::MANAGE],
                    'demo-a' => ['synthetic-company-a', 'synthetic-person-a', PortalAccessGate::VIEW],
                    'demo-b' => ['synthetic-company-b', 'synthetic-person-b', PortalAccessGate::VIEW],
                ];
                $entry = $sessions[$serverSessionCredential] ?? null;
                if ($entry === null || $entry[0] !== $companyId || $entry[2] !== $permission) {
                    return PortalGrant::deny('missing_permission');
                }
                return PortalGrant::allow($entry[0], $entry[1], $entry[2], 1, time() + 30);
            }
        });
    }

    private function asPortal(string $session, string $company): void
    {
        $this->withSession([
            'portal_server_credential' => $session,
            'portal_company_id' => $company,
        ]);
    }

    public function test_one_editorial_course_serves_two_clients_with_distinct_progress(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');

        $courseResponse = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'metodologia-de-crescimento',
            'title' => 'Metodologia Imagine',
            'category' => 'metodologia',
            'summary' => 'Trilha simples em três pilares',
            'sort_order' => 0,
        ])->assertCreated();
        $courseId = $courseResponse->json('id');

        $lessonResponse = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'primeira-aula',
            'title' => 'Visitas, leads e clientes',
            'body' => 'A visita sozinha ainda não representa uma compra ou contato.',
        ])->assertCreated();
        $lessonId = $lessonResponse->json('id');

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(0, 'courses');

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")
            ->assertOk()->assertJsonPath('published', true);

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.lessons_total', 1)
            ->assertJsonPath('courses.0.lessons_completed', 0)
            ->assertJsonPath('courses.0.progress_percent', 0);
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', false);
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")
            ->assertOk()->assertJsonPath('completed', true);
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonPath('courses.0.lessons_total', 1)
            ->assertJsonPath('courses.0.lessons_completed', 1)
            ->assertJsonPath('courses.0.progress_percent', 100);
        $this->getJson("/universidade/private/courses/{$courseId}/lessons")->assertOk()
            ->assertJsonCount(1, 'lessons')
            ->assertJsonPath('lessons.0.completed', 1);

        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.lessons_completed', 0)
            ->assertJsonPath('courses.0.progress_percent', 0);
        $this->getJson("/universidade/private/courses/{$courseId}/lessons")->assertOk()
            ->assertJsonPath('lessons.0.completed', 0);
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', false);

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', true);
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")->assertOk();

        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_unpublish_republish_uses_fresh_lesson_identity_and_keeps_history(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $course = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-versionado',
            'title' => 'Curso versionado',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $firstLesson = $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'etapa-um',
            'title' => 'Etapa um',
            'body' => 'Conteúdo inicial para esta aula simples.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$firstLesson}/complete")->assertOk();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $newLessons = $this->getJson("/universidade/private/courses/{$course}/lessons")
            ->assertOk()->json('lessons');
        self::assertCount(1, $newLessons);
        $newId = $newLessons[0]['id'];
        self::assertNotEquals($firstLesson, $newId);
        $this->getJson("/universidade/private/lessons/{$newId}/progress")
            ->assertOk()->assertJsonPath('completed', false);
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonPath('courses.0.lessons_total', 1)
            ->assertJsonPath('courses.0.lessons_completed', 0)
            ->assertJsonPath('courses.0.progress_percent', 0);
        $this->getJson("/universidade/private/courses/{$course}/lessons")->assertOk()
            ->assertJsonPath('lessons.0.completed', 0);
        $this->getJson("/universidade/private/lessons/{$firstLesson}")->assertNotFound();

        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_client_cannot_manage_editorial_catalog(): void
    {
        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'conteudo-indevido',
            'title' => 'Conteúdo indevido',
            'category' => 'sistemas',
        ])->assertForbidden();
        self::assertSame(0, DB::table('educational_courses')->count());
    }
    public function test_initialization_is_idempotent_and_requires_a_client_grant(): void
    {
        // Remover somente o registro sintético para testar provisão inicial.
        DB::table('educational_organizations')
            ->where('synthetic_key', 'synthetic-company-a')->delete();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson('/universidade/private/initialize')->assertForbidden();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson('/universidade/private/initialize')
            ->assertOk()->assertJsonPath('ready', true);
        $this->postJson('/universidade/private/initialize')
            ->assertOk()->assertJsonPath('ready', true);

        self::assertSame(1, DB::table('educational_organizations')
            ->where('synthetic_key', 'synthetic-company-a')->count());

        // Falha de sessão não deve liberar cadastro da empresa B.
        $this->asPortal('not-verified', 'synthetic-company-b');
        $this->postJson('/universidade/private/initialize')->assertForbidden();
    }


    public function test_admin_mutations_write_minimal_audit_but_student_actions_do_not(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $course = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-auditado',
            'title' => 'Curso auditado',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');

        $lesson = $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'aula-auditada',
            'title' => 'Aula auditada',
            'body' => 'Conteúdo fictício sem dados pessoais.',
        ])->assertCreated()->json('id');

        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();

        $events = DB::table('educational_audit_events')->orderBy('id')->get();
        self::assertCount(3, $events);
        self::assertSame(
            ['course.created', 'lesson.created', 'course.published'],
            $events->pluck('action')->all()
        );
        foreach ($events as $event) {
            self::assertSame('synthetic-editor', $event->actor_key);
            self::assertSame(1, $event->authority_revision);
            self::assertNotEmpty($event->occurred_at);
        }
        self::assertFalse(\Illuminate\Support\Facades\Schema::hasColumn(
            'educational_audit_events', 'session_token'
        ));

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$lesson}/complete")->assertOk();
        self::assertSame(3, DB::table('educational_audit_events')->count());

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();
        self::assertSame(4, DB::table('educational_audit_events')->count());
        self::assertSame('course.unpublished', DB::table('educational_audit_events')
            ->orderByDesc('id')->value('action'));
    }


    public function test_only_editor_can_delete_draft_lesson_with_audit(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-rascunho',
            'title' => 'Curso Rascunho',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-rascunho',
            'title' => 'Aula rascunho',
            'body' => 'Conteúdo sintético que ainda não foi publicado.',
        ])->assertCreated()->json('id');

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->deleteJson("/universidade/private/admin/lessons/{$lessonId}")->assertForbidden();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->deleteJson("/universidade/private/admin/lessons/{$lessonId}")
            ->assertOk()->assertJsonPath('deleted', true);
        self::assertSame(0, DB::table('educational_lessons')->where('id', $lessonId)->count());
        self::assertSame('lesson.deleted', DB::table('educational_audit_events')
            ->orderByDesc('id')->value('action'));
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")
            ->assertStatus(409);
    }

    public function test_draft_lesson_with_legacy_progress_must_not_be_deleted(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-legado',
            'title' => 'Curso Legado',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-legada',
            'title' => 'Aula legada',
            'body' => 'Conteúdo fictício com registro histórico para preservação.',
        ])->assertCreated()->json('id');

        $orgId = DB::table('educational_organizations')
            ->where('synthetic_key', 'synthetic-company-a')->value('id');
        $now = now();
        DB::table('educational_lesson_progress')->insert([
            'educational_organization_id' => $orgId,
            'educational_lesson_id' => $lessonId,
            'subject_key' => 'synthetic-person-a',
            'completed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->deleteJson("/universidade/private/admin/lessons/{$lessonId}")
            ->assertNotFound();
        self::assertSame(1, DB::table('educational_lessons')->where('id', $lessonId)->count());
        self::assertSame(1, DB::table('educational_lesson_progress')
            ->where('educational_lesson_id', $lessonId)->count());
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('action', 'lesson.deleted')->count());
    }


    public function test_completion_does_not_claim_success_on_unexpected_unique_conflict(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $course = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-conflito',
            'title' => 'Curso de integridade',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');

        $first = $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'primeira',
            'title' => 'Primeira aula',
            'body' => 'Conteúdo fictício da primeira aula.',
        ])->assertCreated()->json('id');

        $second = $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'segunda',
            'title' => 'Segunda aula',
            'body' => 'Conteúdo fictício da segunda aula.',
        ])->assertCreated()->json('id');

        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$first}/complete")
            ->assertOk()->assertJsonPath('completed', true);

        // Índice adversarial temporário EXCLUSIVO de teste: força o banco
        // a ignorar uma inserção por conflito não relacionado à chave
        // idempotente (empresa + usuário + aula).
        DB::statement('CREATE UNIQUE INDEX edu_test_unexpected_progress_conflict ON educational_lesson_progress (subject_key)');

        $this->postJson("/universidade/private/lessons/{$second}/complete")->assertNotFound();
        $this->getJson("/universidade/private/lessons/{$second}/progress")
            ->assertOk()->assertJsonPath('completed', false);
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_archived_lesson_cannot_be_completed_again(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $course = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'arquivo-protegido',
            'title' => 'Curso com arquivo protegido',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $lesson = $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'aula-arquivada',
            'title' => 'Aula arquivada',
            'body' => 'Um texto fictício que será arquivado.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$course}/unpublish")->assertOk();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$lesson}/complete")->assertNotFound();
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
    }


    public function test_published_course_cannot_be_edited_and_preserves_its_title(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-imutavel',
            'title' => 'Título aprovado',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');

        $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-um',
            'title' => 'Aula única',
            'body' => 'Conteúdo sintético de teste sem informações de clientes.',
        ])->assertCreated();

        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")->assertOk();

        $this->patchJson("/universidade/private/admin/courses/{$courseId}", [
            'title' => 'Alteração indevida',
            'summary' => 'Não pode sobrescrever publicação',
            'category' => 'metodologia',
        ])->assertNotFound();

        self::assertSame('Título aprovado', DB::table('educational_courses')
            ->where('id', $courseId)->value('title'));
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('action', 'course.updated')
            ->count());
    }


    public function test_only_editor_can_delete_a_never_published_course_and_its_drafts_with_audit(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-criado-por-engano',
            'title' => 'Curso criado por engano',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-inicial',
            'title' => 'Aula inicial do curso',
            'body' => 'Conteúdo sintético não publicado e sem progresso.',
        ])->assertCreated()->json('id');

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->deleteJson("/universidade/private/admin/courses/{$courseId}")->assertForbidden();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->deleteJson("/universidade/private/admin/courses/{$courseId}")
            ->assertOk()->assertJsonPath('deleted', true);
        self::assertSame(0, DB::table('educational_courses')->where('id', $courseId)->count());
        self::assertSame(0, DB::table('educational_lessons')->where('id', $lessonId)->count());
        self::assertSame(1, DB::table('educational_audit_events')
            ->where('action', 'course.deleted')->where('resource_id', $courseId)->count());
        $this->deleteJson("/universidade/private/admin/courses/{$courseId}")->assertNotFound();
    }

    public function test_course_with_archived_version_cannot_be_deleted_even_when_unpublished(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-com-historico',
            'title' => 'Curso com histórico',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-publicada',
            'title' => 'Aula publicada no passado',
            'body' => 'Esta aula já esteve publicada e não pode ser apagada.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")->assertOk();
        $this->postJson("/universidade/private/admin/courses/{$courseId}/unpublish")->assertOk();

        $this->deleteJson("/universidade/private/admin/courses/{$courseId}")->assertNotFound();
        self::assertSame(1, DB::table('educational_courses')->where('id', $courseId)->count());
        self::assertSame(2, DB::table('educational_course_versions')
            ->where('educational_course_id', $courseId)->count());
        self::assertSame(1, DB::table('educational_lessons')->where('id', $lessonId)->count());
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('action', 'course.deleted')->count());
    }


    public function test_student_can_export_only_own_progress_including_archived_versions(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-exportavel',
            'title' => 'Curso exportável',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-historica-exportavel',
            'title' => 'Aula sobre o funil',
            'body' => 'Conteúdo sintético para exportação autorizada.',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")->assertOk();

        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->getJson('/universidade/private/progress/export')
            ->assertOk()->assertJsonCount(0, 'completions')
            ->assertJsonPath('schema_version', 1);

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")
            ->assertOk()->assertJsonPath('completed', true);
        $export = $this->getJson('/universidade/private/progress/export')
            ->assertOk()->assertJsonCount(1, 'completions')
            ->assertJsonPath('scope', 'current_authenticated_student')
            ->assertJsonPath('completions.0.course_slug', 'curso-exportavel')
            ->assertJsonPath('completions.0.course_version', 1)
            ->assertJsonPath('completions.0.lesson_slug', 'aula-historica-exportavel')
            ->assertHeader('Content-Disposition', 'attachment; filename="imagine-universidade-progresso.json"');
        $export->assertDontSee('synthetic-person-a')->assertDontSee('synthetic-company-a');
        self::assertStringNotContainsString('subject_key', $export->getContent());

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/unpublish")
            ->assertOk();
        $this->getJson('/universidade/private/progress/export')->assertForbidden();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson('/universidade/private/progress/export')
            ->assertOk()->assertJsonCount(1, 'completions')
            ->assertJsonPath('completions.0.course_version', 1);
        $this->getJson("/universidade/private/lessons/{$lessonId}")->assertNotFound();

        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->getJson('/universidade/private/progress/export')
            ->assertOk()->assertJsonCount(0, 'completions');
    }

    public function test_export_rejects_forged_session_company_and_unverified_permissions(): void
    {
        $this->asPortal('demo-a', 'synthetic-company-b');
        $this->getJson('/universidade/private/progress/export')->assertForbidden();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->getJson('/universidade/private/progress/export')->assertForbidden();

        $this->withSession([
            'portal_server_credential' => 'no-verified-session',
            'portal_company_id' => 'synthetic-company-a',
        ]);
        $this->getJson('/universidade/private/progress/export')->assertForbidden();
    }


    public function test_editorial_audit_is_private_bounded_paged_and_excludes_actor_key(): void
    {
        $orgId = (int) DB::table('educational_organizations')
            ->where('synthetic_key', 'imagine-editorial')->value('id');
        $now = now();
        foreach (range(1, 55) as $index) {
            DB::table('educational_audit_events')->insert([
                'educational_organization_id' => $orgId,
                'actor_key' => 'synthetic-editor-secret',
                'action' => 'course.updated',
                'resource_kind' => 'course',
                'resource_id' => $index,
                'authority_revision' => 1,
                'occurred_at' => $now,
            ]);
        }

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson('/universidade/private/admin/audit')->assertForbidden();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $first = $this->getJson('/universidade/private/admin/audit')
            ->assertOk()->assertJsonCount(50, 'events');
        self::assertIsInt($first->json('next_before_id'));
        self::assertArrayNotHasKey('actor_key', $first->json('events.0'));
        $first->assertDontSee('synthetic-editor-secret');
        self::assertSame(55, $first->json('events.0.resource_id'));

        $second = $this->getJson('/universidade/private/admin/audit?before_id='.
            $first->json('next_before_id'))
            ->assertOk()->assertJsonCount(5, 'events')
            ->assertJsonPath('next_before_id', null);
        self::assertSame(5, $second->json('events.0.resource_id'));
        $this->getJson('/universidade/private/admin/audit?before_id=not-a-number')
            ->assertUnprocessable();
        $this->getJson('/universidade/private/admin/audit?before_id=-1')
            ->assertUnprocessable();
    }


    public function test_editorial_publish_denies_grant_expired_during_version_read(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'teste-expiracao-editorial',
            'title' => 'Trilha sintética aguardando lock',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-antes-de-publicar',
            'title' => 'Aula ainda não publicada',
            'body' => 'Conteúdo fictício para demonstrar expiração sob lock.',
        ])->assertCreated();

        $grant = PortalGrant::allow(
            'imagine-editorial', 'synthetic-editor', PortalAccessGate::MANAGE,
            1, time() + 2,
        );
        $delayed = false;
        DB::listen(static function (
            \Illuminate\Database\Events\QueryExecuted $event
        ) use (&$delayed): void {
            if (!$delayed && str_contains($event->sql, 'educational_course_versions')) {
                $delayed = true;
                sleep(3);
            }
        });

        self::assertFalse((new \App\Domain\Learning\UniversityCatalogRepository())
            ->setPublished($grant, $courseId, true));
        self::assertTrue($delayed, 'Expire the grant while the transaction reads versions.');
        self::assertSame(0, DB::table('educational_courses')
            ->where('id', $courseId)->where('is_published', true)->count());
        self::assertSame(1, DB::table('educational_course_versions')
            ->where('educational_course_id', $courseId)->where('status', 'draft')->count());
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('action', 'course.published')->where('resource_id', $courseId)->count());
    }

    public function test_editorial_delete_denies_grant_expired_during_version_read(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'teste-expiracao-exclusao',
            'title' => 'Curso nunca publicado protegido',
            'category' => 'negocios',
        ])->assertCreated()->json('id');

        $grant = PortalGrant::allow(
            'imagine-editorial', 'synthetic-editor', PortalAccessGate::MANAGE,
            1, time() + 2,
        );
        $delayed = false;
        DB::listen(static function (
            \Illuminate\Database\Events\QueryExecuted $event
        ) use (&$delayed): void {
            if (!$delayed && str_contains($event->sql, 'educational_course_versions')) {
                $delayed = true;
                sleep(3);
            }
        });

        self::assertFalse((new \App\Domain\Learning\UniversityCatalogRepository())
            ->deleteNeverPublishedCourse($grant, $courseId));
        self::assertTrue($delayed);
        self::assertSame(1, DB::table('educational_courses')->where('id', $courseId)->count());
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('action', 'course.deleted')->where('resource_id', $courseId)->count());
    }


    public function test_publication_preflight_is_advisory_scoped_and_prevents_stale_revision(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'preflight-editorial',
            'title' => 'Curso candidato a revisão',
            'category' => 'metodologia',
        ])->assertCreated()->json('id');

        $check = "/universidade/private/admin/courses/{$courseId}/publication-check";
        $this->getJson($check)->assertOk()
            ->assertJsonPath('ready', false)
            ->assertJsonPath('issues.0', 'missing_lessons')
            ->assertJsonPath('warnings.0', 'missing_optional_summary')
            ->assertJsonPath('lesson_count', 0)
            ->assertJsonPath('advisory_only', true);

        $lessonId = (int) $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'primeira-aula',
            'title' => 'Aula sintética',
            'body' => 'Texto fictício com orientações simples para o aluno.',
        ])->assertCreated()->json('id');

        $before = $this->getJson($check)->assertOk()
            ->assertJsonPath('ready', true)->assertJsonPath('lesson_count', 1)->json();
        self::assertSame([], $before['issues']);
        self::assertSame(64, strlen($before['content_hash']));
        self::assertSame(0, DB::table('educational_courses')
            ->where('id', $courseId)->where('is_published', true)->count());

        $this->patchJson("/universidade/private/admin/lessons/{$lessonId}", [
            'title' => 'Aula alterada depois da prévia',
            'body' => 'Texto novo de outro editor, ainda somente em laboratório.',
        ])->assertOk();

        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish", [
            'expected_content_hash' => $before['content_hash'],
        ])->assertStatus(409);
        self::assertSame(0, DB::table('educational_courses')
            ->where('id', $courseId)->where('is_published', true)->count());
        self::assertSame(0, DB::table('educational_audit_events')
            ->where('resource_id', $courseId)->where('action', 'course.published')->count());

        $after = $this->getJson($check)->assertOk()->assertJsonPath('ready', true)->json();
        self::assertNotSame($before['content_hash'], $after['content_hash']);
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish", [
            'expected_content_hash' => $after['content_hash'],
        ])->assertOk()->assertJsonPath('published', true);
        $this->getJson($check)->assertOk()
            ->assertJsonPath('ready', false)->assertJsonPath('issues.0', 'not_draft');

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->getJson($check)->assertForbidden();
        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->getJson('/universidade/private/admin/courses/999999/publication-check')
            ->assertNotFound();
    }

    public function test_course_version_and_lesson_references_reject_cascading_deletion(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-preservado',
            'title' => 'Curso histórico',
            'category' => 'negocios',
        ])->assertCreated()->json('id');

        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'aula-historica',
            'title' => 'Aula histórica',
            'body' => 'Histórico precisa sobreviver a exclusões acidentais.',
        ])->assertCreated()->json('id');

        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")->assertOk();
        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")->assertOk();

        try {
            DB::table('educational_lessons')->where('id', $lessonId)->delete();
            self::fail('A exclusão de aula com progresso deveria falhar pela FK RESTRICT.');
        } catch (\Illuminate\Database\QueryException) {
            // O progresso histórico continua preservado.
        }

        try {
            DB::table('educational_courses')->where('id', $courseId)->delete();
            self::fail('A exclusão do curso com versão publicada deveria falhar.');
        } catch (\Illuminate\Database\QueryException) {
            // O curso histórico não pode sumir em cascata.
        }

        self::assertSame(1, DB::table('educational_courses')->where('id', $courseId)->count());
        self::assertSame(1, DB::table('educational_lessons')->where('id', $lessonId)->count());
        self::assertSame(1, DB::table('educational_lesson_progress')
            ->where('educational_lesson_id', $lessonId)->count());
    }

    public function test_private_lesson_search_only_returns_published_content_with_fresh_portal_grant(): void
    {
        $this->asPortal('demo-editor', 'imagine-editorial');
        $courseId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-de-busca', 'title' => 'Presença digital clara',
            'category' => 'metodologia', 'summary' => 'Orientações práticas',
        ])->assertCreated()->json('id');
        $lessonId = $this->postJson("/universidade/private/admin/courses/{$courseId}/lessons", [
            'slug' => 'vitrine-digital', 'title' => 'Organize sua vitrine digital',
            'body' => "Uma vitrine simples ajuda as pessoas a encontrar informações úteis.\n\nUse uma página clara e evite promessas comerciais.",
        ])->assertCreated()->json('id');

        // Unpublished drafts must never appear through private search.
        $draftId = $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'curso-secreto', 'title' => 'Segredo do material ainda não aprovado',
            'category' => 'negocios',
        ])->assertCreated()->json('id');
        $this->postJson("/universidade/private/admin/courses/{$draftId}/lessons", [
            'slug' => 'segredo-privado', 'title' => 'Segredo editorial',
            'body' => 'Conteúdo secreto de laboratório aguardando publicação.',
        ])->assertCreated();

        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertOk()->assertJsonCount(0, 'results');
        $this->postJson('/universidade/private/search', ['query' => 'segredo'])
            ->assertOk()->assertJsonCount(0, 'results');

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/publish")
            ->assertOk()->assertJsonPath('published', true);

        $this->asPortal('demo-a', 'synthetic-company-a');
        $found = $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertOk()->assertJsonCount(1, 'results')
            ->assertJsonPath('results.0.course_id', $courseId)
            ->assertJsonPath('results.0.lesson_id', $lessonId)
            ->assertJsonPath('results.0.lesson_title', 'Organize sua vitrine digital')
            ->assertHeader('Cache-Control', 'private, no-store');
        self::assertSame(
            ['course_id', 'course_title', 'lesson_id', 'lesson_title', 'snippet'],
            array_keys($found->json('results.0')),
        );
        $found->assertDontSee('synthetic-person-a')
            ->assertDontSee('synthetic-company-a')
            ->assertDontSee('portal_server_credential');
        $this->postJson('/universidade/private/search', ['query' => 'SEGREDO'])
            ->assertOk()->assertJsonCount(0, 'results');

        // Content is universal for eligible clients, progress/private data is not.
        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertOk()->assertJsonCount(1, 'results');

        // Reject wildcard/symbol attempts and oversize queries; do not
        // log the searched phrase into an unauthenticated GET URL.
        $this->postJson('/universidade/private/search', ['query' => '%'])
            ->assertUnprocessable();
        $this->postJson('/universidade/private/search', ['query' => '_'])
            ->assertUnprocessable();
        $this->postJson('/universidade/private/search', ['query' => '<script>'])
            ->assertUnprocessable();
        $this->postJson('/universidade/private/search', ['query' => str_repeat('a', 61)])
            ->assertUnprocessable();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertForbidden();
        $this->asPortal('no-verified-session', 'synthetic-company-a');
        $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertForbidden();

        $this->asPortal('demo-editor', 'imagine-editorial');
        $this->postJson("/universidade/private/admin/courses/{$courseId}/unpublish")
            ->assertOk();
        $this->asPortal('demo-a', 'synthetic-company-a');
        $this->postJson('/universidade/private/search', ['query' => 'vitrine'])
            ->assertOk()->assertJsonCount(0, 'results');
    }

}
