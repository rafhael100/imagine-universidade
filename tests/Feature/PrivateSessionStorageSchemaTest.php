<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Only verify structure in an in-memory lab: not a real client session.
 */
final class PrivateSessionStorageSchemaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
    }

    public function test_migration_prepares_session_storage_without_creating_any_session(): void
    {
        self::assertTrue(Schema::hasTable('sessions'));
        foreach (['id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity'] as $column) {
            self::assertTrue(Schema::hasColumn('sessions', $column));
        }
        self::assertSame(0, DB::table('sessions')->count());
        self::assertSame('array', config('session.driver'), 'Synthetic QA must not activate DB sessions.');
        self::assertNull(DB::table('educational_organizations')->first());
    }

    public function test_synthetic_session_row_can_be_stored_without_any_portal_grant(): void
    {
        DB::table('sessions')->insert([
            'id' => 'ci-synthetic-session-row-only',
            'user_id' => null,
            'ip_address' => null,
            'user_agent' => null,
            'payload' => base64_encode('synthetic-no-customer-data'),
            'last_activity' => 1800000000,
        ]);
        self::assertSame(1, DB::table('sessions')->count());
        self::assertSame(0, DB::table('educational_organizations')->count());
        $this->getJson('/universidade/private/courses')->assertForbidden();
    }
}
