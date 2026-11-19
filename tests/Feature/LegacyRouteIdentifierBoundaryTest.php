<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Tutor\TutorGateway;
use App\Domain\Tutor\TutorQuestion;
use App\Domain\Tutor\TutorReply;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\TestCase;

/** Actual HTTP dispatcher/middleware/SQL; only identity and a disabled Tutor spy are synthetic. */
final class LegacyRouteIdentifierBoundaryTest extends TestCase
{
    private const BASE = '/universidade/private';
    private const STAMP = '2026-11-17 10:00:00';
    private const CSRF = 'c138-synthetic-token-not-a-credential';
    private PortalAuthority $authority;
    private TutorGateway $tutor;
    private array $published;
    private array $draft;
    private array $businessQueries = [];

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'c138-company'] as $company) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $company, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ]);
        }
        $this->published = $this->fixture('published-course', true);
        $this->draft = $this->fixture('draft-course', false);

        $this->authority = new class implements PortalAuthority {
            public int $checks = 0;
            public int $allowedChecks = PHP_INT_MAX;
            public bool $denyInTransaction = false;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                $identity = [
                    'c138-editor' => ['imagine-editorial', PortalAccessGate::MANAGE],
                    'c138-student' => ['c138-company', PortalAccessGate::VIEW],
                ][$credential] ?? null;
                if ($this->checks > $this->allowedChecks || $identity === null
                    || $identity[0] !== $companyId || $identity[1] !== $permission
                    || ($this->denyInTransaction && DB::transactionLevel() > 0)) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($companyId, 'c138-synthetic-person', $permission, 1, time() + 60);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->tutor = new class implements TutorGateway {
            public int $calls = 0;

            public function explain(TutorQuestion $question): TutorReply
            {
                $this->calls++;
                throw new RuntimeException('Synthetic Tutor remains disabled');
            }
        };
        $this->app->instance(TutorGateway::class, $this->tutor);
        DB::listen(function (QueryExecuted $query): void {
            if (str_contains($query->sql, 'educational_')) {
                $this->businessQueries[] = $query->sql;
            }
        });
    }

    private function fixture(string $slug, bool $published): array
    {
        $organization = (int) DB::table('educational_organizations')
            ->where('synthetic_key', 'imagine-editorial')->value('id');
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $organization, 'slug' => $slug,
            'title' => 'Curso sintético de limites', 'category' => 'metodologia', 'summary' => 'Resumo sintético.',
            'sort_order' => 7, 'is_shared' => true, 'is_published' => $published,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => $published ? 'published' : 'draft',
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        $lesson = (int) DB::table('educational_lessons')->insertGetId([
            'educational_course_version_id' => $version, 'slug' => 'synthetic-lesson',
            'title' => 'Aula sintética de limites', 'body' => 'Conteúdo sintético privado para testar referências.',
            'sort_order' => 4, 'is_published' => $published,
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]);
        return ['course' => $course, 'version' => $version, 'lesson' => $lesson];
    }

    private function actAs(string $identity): void
    {
        $this->withSession([
            'portal_server_credential' => $identity,
            'portal_company_id' => $identity === 'c138-editor' ? 'imagine-editorial' : 'c138-company',
        ]);
    }

    private function overflow(): string
    {
        // Decimal literals stay strings; no overflowing arithmetic or float is used by the test.
        return PHP_INT_SIZE === 8 ? '9223372036854775808' : '2147483648';
    }

    private function routeCases(string $id): array
    {
        $course = ['title' => 'Título alterado', 'category' => 'negocios', 'summary' => 'Resumo alterado.'];
        $lesson = ['title' => 'Aula alterada', 'body' => 'Texto sintético alterado explicitamente.'];
        return [
            'favorite' => ['PUT', '/courses/'.$id.'/favorite', [], 'c138-student'],
            'unfavorite' => ['DELETE', '/courses/'.$id.'/favorite', [], 'c138-student'],
            'lessons' => ['GET', '/courses/'.$id.'/lessons', [], 'c138-student'],
            'lesson' => ['GET', '/lessons/'.$id, [], 'c138-student'],
            'tutor' => ['POST', '/lessons/'.$id.'/tutor', ['question' => 'Como estudar esta aula?'], 'c138-student'],
            'progress' => ['GET', '/lessons/'.$id.'/progress', [], 'c138-student'],
            'complete' => ['POST', '/lessons/'.$id.'/complete', [], 'c138-student'],
            'preflight' => ['GET', '/admin/courses/'.$id.'/publication-check', [], 'c138-editor'],
            'admin-lessons' => ['GET', '/admin/courses/'.$id.'/lessons', [], 'c138-editor'],
            'update-course' => ['PATCH', '/admin/courses/'.$id, $course, 'c138-editor'],
            'create-lesson' => ['POST', '/admin/courses/'.$id.'/lessons', ['slug' => 'new-lesson', ...$lesson], 'c138-editor'],
            'update-lesson' => ['PATCH', '/admin/lessons/'.$id, $lesson, 'c138-editor'],
            'delete-lesson' => ['DELETE', '/admin/lessons/'.$id, [], 'c138-editor'],
            'delete-course' => ['DELETE', '/admin/courses/'.$id, [], 'c138-editor'],
            'publish' => ['POST', '/admin/courses/'.$id.'/publish', [], 'c138-editor'],
            'unpublish' => ['POST', '/admin/courses/'.$id.'/unpublish', [], 'c138-editor'],
        ];
    }

    private function snapshot(): array
    {
        $result = [];
        foreach (['educational_organizations', 'educational_courses', 'educational_course_versions',
            'educational_lessons', 'educational_lesson_progress', 'educational_audit_events',
            'educational_course_favorites', 'educational_reading_positions'] as $table) {
            $key = in_array($table, ['educational_course_favorites', 'educational_reading_positions'], true)
                ? 'educational_organization_id' : 'id';
            $result[$table] = DB::table($table)->orderBy($key)->get()
                ->map(static fn ($row): array => (array) $row)->all();
        }
        return $result;
    }

    private function assertPrivateResponse(TestResponse $response): void
    {
        $response->assertHeader('Content-Type', 'application/json')->assertHeader('Pragma', 'no-cache');
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertFalse($response->headers->has('Location'));
    }

    private function assertLegacyMissing(TestResponse $response, string $case, int $id): void
    {
        match ($case) {
            'lessons', 'admin-lessons' => $response->assertOk()->assertExactJson(['lessons' => []]),
            'unfavorite' => $response->assertOk()->assertExactJson(['course_id' => $id, 'favorite' => false]),
            'publish' => $response->assertStatus(409)->assertExactJson(['error' => 'missing_lesson_or_changed_draft']),
            'update-course', 'create-lesson', 'update-lesson' => $response->assertNotFound()
                ->assertExactJson(['error' => 'not_found_or_published']),
            'delete-course', 'delete-lesson' => $response->assertNotFound()
                ->assertExactJson(['error' => 'not_found_or_protected']),
            default => $response->assertNotFound()->assertExactJson(['error' => 'not_found']),
        };
    }

    public function test_all_legacy_route_overflows_are_private_404_before_business_access(): void
    {
        $before = $this->snapshot();
        $this->businessQueries = [];
        foreach ([$this->overflow(), '000'.str_repeat('9', 512)] as $id) {
            foreach ($this->routeCases($id) as [$method, $path, $payload, $identity]) {
                $this->actAs($identity);
                $response = $this->json($method, self::BASE.$path, $payload);
                $response->assertNotFound()->assertExactJson(['error' => 'not_found']);
                $this->assertPrivateResponse($response);
            }
        }
        self::assertSame([], $this->businessQueries, 'Overflow must not enter a repository lookup or mutation.');
        self::assertSame(0, $this->tutor->calls);
        self::assertSame($before, $this->snapshot());
    }

    public function test_representable_absent_ids_keep_each_existing_contract(): void
    {
        $before = $this->snapshot();
        foreach (['999999', (string) PHP_INT_MAX] as $id) {
            foreach ($this->routeCases($id) as $case => [$method, $path, $payload, $identity]) {
                $this->actAs($identity);
                $response = $this->json($method, self::BASE.$path, $payload);
                $this->assertLegacyMissing($response, $case, (int) $id);
                $this->assertPrivateResponse($response);
            }
        }
        self::assertSame(0, $this->tutor->calls);
        self::assertSame($before, $this->snapshot());
    }

    public function test_zero_leading_zeros_and_large_representable_decimals_preserve_legacy_semantics(): void
    {
        $before = $this->snapshot();
        $ids = ['0', str_repeat('0', 64), str_repeat('0', 40).'999999', '000'.PHP_INT_MAX];
        if (PHP_INT_SIZE === 8) {
            $ids = [...$ids, '2147483648', '9007199254740992'];
        }
        foreach ($ids as $id) {
            $this->actAs('c138-student');
            $this->getJson(self::BASE.'/courses/'.$id.'/lessons')->assertOk()->assertExactJson(['lessons' => []]);
            $removed = $this->deleteJson(self::BASE.'/courses/'.$id.'/favorite');
            if ((int) $id === 0) {
                $removed->assertNotFound()->assertExactJson(['error' => 'not_found']);
            } else {
                $removed->assertOk()->assertExactJson(['course_id' => (int) $id, 'favorite' => false]);
            }
            $this->actAs('c138-editor');
            $this->getJson(self::BASE.'/admin/courses/'.$id.'/lessons')->assertOk()->assertExactJson(['lessons' => []]);
            $this->postJson(self::BASE.'/admin/courses/'.$id.'/publish')->assertStatus(409)
                ->assertExactJson(['error' => 'missing_lesson_or_changed_draft']);
        }
        self::assertSame($before, $this->snapshot());
    }

    public function test_leading_zero_aliases_still_target_real_resources_through_all_sixteen_actions(): void
    {
        $prefix = str_repeat('0', 40);
        $course = $prefix.$this->published['course'];
        $lesson = $prefix.$this->published['lesson'];
        $this->actAs('c138-student');
        $this->getJson(self::BASE.'/courses/'.$course.'/lessons')->assertOk()
            ->assertJsonPath('lessons.0.id', $this->published['lesson']);
        $this->getJson(self::BASE.'/lessons/'.$lesson)->assertOk()->assertJsonPath('lesson.id', $this->published['lesson']);
        $this->getJson(self::BASE.'/lessons/'.$lesson.'/progress')->assertOk()->assertExactJson(['completed' => false]);
        $this->postJson(self::BASE.'/lessons/'.$lesson.'/complete')->assertOk()->assertExactJson(['completed' => true]);
        $this->putJson(self::BASE.'/courses/'.$course.'/favorite')->assertOk()
            ->assertExactJson(['course_id' => $this->published['course'], 'favorite' => true]);
        $this->deleteJson(self::BASE.'/courses/'.$course.'/favorite')->assertOk()
            ->assertExactJson(['course_id' => $this->published['course'], 'favorite' => false]);
        $this->postJson(self::BASE.'/lessons/'.$lesson.'/tutor', ['question' => 'Como estudar esta aula?'])
            ->assertStatus(503)->assertExactJson(['error' => 'tutor_unavailable']);
        self::assertSame(1, $this->tutor->calls);

        $this->actAs('c138-editor');
        $course = $prefix.$this->draft['course'];
        $lesson = $prefix.$this->draft['lesson'];
        $this->getJson(self::BASE.'/admin/courses/'.$course.'/lessons')->assertOk()
            ->assertJsonPath('lessons.0.id', $this->draft['lesson']);
        $this->getJson(self::BASE.'/admin/courses/'.$course.'/publication-check')->assertOk()->assertJsonPath('ready', true);
        $this->patchJson(self::BASE.'/admin/courses/'.$course, [
            'title' => 'Curso alterado por alias decimal', 'category' => 'negocios',
        ])->assertOk()->assertExactJson(['saved' => true]);
        $created = $this->postJson(self::BASE.'/admin/courses/'.$course.'/lessons', [
            'slug' => 'temporary-lesson', 'title' => 'Aula temporária', 'body' => 'Conteúdo temporário sintético.',
        ])->assertCreated()->assertJsonPath('status', 'draft')->json('id');
        $this->patchJson(self::BASE.'/admin/lessons/'.$lesson, [
            'title' => 'Aula alterada por alias decimal', 'body' => 'Conteúdo alterado explicitamente no rascunho.',
        ])->assertOk()->assertExactJson(['saved' => true]);
        // C133/C137 omission keeps the existing order even with a decimal route alias.
        self::assertSame(7, (int) DB::table('educational_courses')->where('id', $this->draft['course'])->value('sort_order'));
        self::assertSame(4, (int) DB::table('educational_lessons')->where('id', $this->draft['lesson'])->value('sort_order'));
        $this->deleteJson(self::BASE.'/admin/lessons/'.$prefix.$created)->assertOk()->assertExactJson(['deleted' => true]);
        $this->postJson(self::BASE.'/admin/courses/'.$course.'/publish')->assertOk()->assertExactJson(['published' => true]);
        $this->postJson(self::BASE.'/admin/courses/'.$course.'/unpublish')->assertOk()->assertExactJson(['published' => false]);
        $disposable = $this->fixture('never-published-disposable', false);
        $this->deleteJson(self::BASE.'/admin/courses/'.$prefix.$disposable['course'])->assertOk()
            ->assertExactJson(['deleted' => true]);
    }

    public function test_overflow_precedes_payload_validation_without_changing_validation_for_representable_ids(): void
    {
        $before = $this->snapshot();
        foreach (['tutor', 'update-course', 'create-lesson', 'update-lesson'] as $case) {
            [$method, $path, , $identity] = $this->routeCases($this->overflow())[$case];
            $this->actAs($identity);
            $this->json($method, self::BASE.$path, [])->assertNotFound()->assertExactJson(['error' => 'not_found']);
            [$method, $path] = $this->routeCases('999999')[$case];
            $this->json($method, self::BASE.$path, [])->assertUnprocessable();
        }
        self::assertSame(0, $this->tutor->calls);
        self::assertSame($before, $this->snapshot());
    }

    public function test_default_deny_and_wrong_capability_still_precede_route_parsing(): void
    {
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->businessQueries = [];
        foreach ($this->routeCases($this->overflow()) as [$method, $path, $payload, $identity]) {
            $this->actAs($identity);
            $this->json($method, self::BASE.$path, $payload)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        }
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->actAs('c138-student');
        $this->patchJson(self::BASE.'/admin/courses/'.$this->overflow(), [])->assertForbidden();
        $this->actAs('c138-editor');
        $this->getJson(self::BASE.'/lessons/'.$this->overflow())->assertForbidden();
        self::assertSame([], $this->businessQueries);
        self::assertSame(0, $this->tutor->calls);
    }

    public function test_actual_csrf_middleware_still_precedes_overflow_handling(): void
    {
        // As in the existing response-boundary tests, a non-testing marker
        // activates Laravel's real CSRF middleware; no middleware is disabled.
        $this->app->instance('env', 'synthetic-c138-http-boundary');
        $this->withSession(['_token' => self::CSRF]);
        $cases = $this->routeCases($this->overflow());
        foreach (['favorite', 'tutor', 'update-course', 'delete-course'] as $case) {
            [$method, $path, $payload, $identity] = $cases[$case];
            $this->actAs($identity);
            $response = $this->json($method, self::BASE.$path, $payload);
            $response->assertStatus(419);
            $this->assertPrivateResponse($response);
        }
        $this->withHeader('X-CSRF-TOKEN', self::CSRF);
        $this->actAs('c138-editor');
        $this->patchJson(self::BASE.'/admin/courses/'.$this->overflow(), [])->assertNotFound()
            ->assertExactJson(['error' => 'not_found']);
        self::assertSame([], $this->businessQueries);
        self::assertSame(0, $this->tutor->calls);
    }

    public function test_get_revalidation_and_transactional_write_revalidation_remain_active(): void
    {
        $this->actAs('c138-student');
        $this->authority->allowedChecks = 1;
        $this->getJson(self::BASE.'/lessons/'.$this->overflow())->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertSame(2, $this->authority->checks);
        self::assertSame([], $this->businessQueries);

        $this->authority->allowedChecks = PHP_INT_MAX;
        $this->authority->denyInTransaction = true;
        $before = $this->snapshot();
        // The legacy complete action reports a failed live write fence as 404;
        // C138 must preserve that contract and keep the transaction unchanged.
        $this->postJson(self::BASE.'/lessons/000'.$this->published['lesson'].'/complete')->assertNotFound()
            ->assertExactJson(['error' => 'not_found']);
        self::assertSame($before, $this->snapshot());
        self::assertSame(0, $this->tutor->calls);
    }
}
