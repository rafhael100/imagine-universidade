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

        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->getJson('/universidade/private/courses')->assertOk()
            ->assertJsonCount(1, 'courses')
            ->assertJsonPath('courses.0.lessons_completed', 0)
            ->assertJsonPath('courses.0.progress_percent', 0);
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

}
