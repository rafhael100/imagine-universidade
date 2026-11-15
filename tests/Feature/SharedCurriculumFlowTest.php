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
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(1, 'courses');
        $this->getJson("/universidade/private/lessons/{$lessonId}/progress")
            ->assertOk()->assertJsonPath('completed', false);
        $this->postJson("/universidade/private/lessons/{$lessonId}/complete")
            ->assertOk()->assertJsonPath('completed', true);

        $this->asPortal('demo-b', 'synthetic-company-b');
        $this->getJson('/universidade/private/courses')->assertOk()->assertJsonCount(1, 'courses');
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


}
