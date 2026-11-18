<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use Illuminate\Database\Events\QueryExecuted;
use App\Domain\Access\PortalGrant;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Real dispatcher, middleware, migrations and SQL; only the authority is synthetic. */
final class EditorialAuditPaginationFlowTest extends TestCase
{
    private const URL = '/universidade/private/admin/audit';
    private const STAMP = '2026-11-18 10:00:00';
    private PortalAuthority $authority;
    private array $auditReads = [];

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'c142-company'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => self::STAMP, 'updated_at' => self::STAMP,
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public int $revision = 1;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $identity = [
                    'editor' => ['imagine-editorial', PortalAccessGate::MANAGE],
                    'student' => ['c142-company', PortalAccessGate::VIEW],
                    'manager' => ['c142-company', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $identity === null || $identity[0] !== $companyId || $identity[1] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($companyId, 'c142-private-operator', $permission, $this->revision, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
        $this->actAs('editor');
        DB::listen(function (QueryExecuted $query): void {
            if (str_starts_with(strtolower($query->sql), 'select') && str_contains($query->sql, 'educational_audit_events')) {
                $this->auditReads[] = $query->sql;
            }
        });
    }

    private function actAs(string $identity): void
    {
        $this->withSession(['portal_server_credential' => $identity,
            'portal_company_id' => $identity === 'editor' ? 'imagine-editorial' : 'c142-company']);
    }

    private function event(int $id, string $owner = 'imagine-editorial'): void
    {
        DB::table('educational_audit_events')->insert([
            'id' => $id,
            'educational_organization_id' => DB::table('educational_organizations')->where('synthetic_key', $owner)->value('id'),
            'actor_key' => 'c142-private-operator', 'action' => 'course.updated',
            'resource_kind' => 'course', 'resource_id' => $id,
            'authority_revision' => 1, 'occurred_at' => self::STAMP,
        ]);
    }

    public function test_fifty_plus_one_events_above_int4_continue_without_losing_or_repeating_an_event(): void
    {
        $firstId = 2147483700;
        foreach (range($firstId, $firstId + 50) as $id) {
            $this->event($id);
        }
        $this->event($firstId + 51, 'c142-company');
        $before = DB::table('educational_audit_events')->orderBy('id')->get()->all();
        $this->auditReads = [];

        $first = $this->getJson(self::URL.'?company_id=c142-company&subject_key=another-operator', [
            'X-Company-Id' => 'c142-company', 'X-Portal-Grant' => 'true',
        ])->assertOk()->assertJsonCount(50, 'events')
            ->assertJsonPath('next_before_id', $firstId + 1)
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertSame(range($firstId + 50, $firstId + 1), array_column($first->json('events'), 'id'));
        $second = $this->getJson(self::URL.'?before_id='.$first->json('next_before_id'))
            ->assertOk()->assertJsonCount(1, 'events')->assertJsonPath('events.0.id', $firstId)
            ->assertJsonPath('next_before_id', null);
        self::assertCount(2, $this->auditReads);
        foreach ($this->auditReads as $query) {
            self::assertStringContainsString('limit 51', strtolower($query));
        }
        foreach ([$first, $second] as $response) {
            $response->assertDontSee('actor_key')->assertDontSee('c142-private-operator')
                ->assertDontSee('educational_organization_id');
            self::assertSame(['id', 'action', 'resource_kind', 'resource_id', 'authority_revision', 'occurred_at'],
                array_keys($response->json('events.0')));
            self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
            self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        }
        self::assertEquals($before, DB::table('educational_audit_events')->orderBy('id')->get()->all());
    }

    public function test_maximum_safe_cursor_is_exact_exclusive_and_needs_no_existing_anchor(): void
    {
        $this->event(9007199254740991);
        $this->event(9007199254740989);
        $this->getJson(self::URL.'?before_id=9007199254740991')->assertOk()
            ->assertJsonCount(1, 'events')->assertJsonPath('events.0.id', 9007199254740989)
            ->assertJsonPath('next_before_id', null);
        $this->getJson(self::URL.'?before_id=9007199254740990')->assertOk()
            ->assertJsonCount(1, 'events')->assertJsonPath('events.0.id', 9007199254740989);
        $this->getJson(self::URL.'?before_id=1')->assertOk()
            ->assertExactJson(['events' => [], 'next_before_id' => null]);
    }

    public function test_existing_integer_formats_are_preserved_for_the_wider_cursor(): void
    {
        $this->event(2147483648);
        foreach (['2147483649', '%2B2147483649', '%202147483649%20'] as $cursor) {
            $this->getJson(self::URL.'?before_id='.$cursor)->assertOk()
                ->assertJsonPath('events.0.id', 2147483648)->assertJsonPath('next_before_id', null);
        }
    }

    public function test_out_of_range_and_non_integer_cursors_never_reach_the_audit_query(): void
    {
        $this->event(2147483648);
        foreach (['0', '-1', '9007199254740992', '9223372036854775807', '1.5', '1e3', '01', 'invalid'] as $cursor) {
            $this->getJson(self::URL.'?before_id='.$cursor)->assertUnprocessable()
                ->assertJsonValidationErrors('before_id');
        }
        $this->getJson(self::URL.'?before_id[]=2')->assertUnprocessable()->assertJsonValidationErrors('before_id');
        self::assertSame([], $this->auditReads);
    }

    public function test_missing_capability_is_denied_and_foreign_manage_keeps_its_legacy_empty_result(): void
    {
        $this->event(2147483648);
        foreach (['student', 'unknown'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL.'?before_id=9007199254740991')->assertForbidden()
                ->assertExactJson(['error' => 'access_denied']);
        }
        $this->actAs('manager');
        $this->getJson(self::URL.'?before_id=9007199254740991')->assertOk()
            ->assertExactJson(['events' => [], 'next_before_id' => null]);
        self::assertSame([], $this->auditReads);
    }

    public function test_revocation_after_the_large_id_query_suppresses_the_entire_page(): void
    {
        $this->event(2147483648);
        $authority = $this->authority;
        $observed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$observed): void {
            if (str_starts_with(strtolower($query->sql), 'select') && str_contains($query->sql, 'educational_audit_events')) {
                $observed = true;
                $authority->active = false;
            }
        });
        $this->getJson(self::URL.'?before_id=9007199254740991')->assertForbidden()
            ->assertExactJson(['error' => 'access_denied'])->assertDontSee('course.updated');
        self::assertTrue($observed);
    }

    public function test_authority_revision_change_during_read_cannot_release_the_old_page(): void
    {
        $this->event(2147483648);
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_starts_with(strtolower($query->sql), 'select') && str_contains($query->sql, 'educational_audit_events')) {
                $authority->revision = 2;
            }
        });
        $this->getJson(self::URL.'?before_id=9007199254740991')->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertSame(2, $authority->revision);
    }
}
