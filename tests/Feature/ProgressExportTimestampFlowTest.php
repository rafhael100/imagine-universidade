<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Real export routes, middleware and SQLite; only Portal decisions and test data are synthetic. */
final class ProgressExportTimestampFlowTest extends TestCase
{
    private const URL = '/universidade/private/progress/export';
    private const STORED = '2026-11-17 10:00:00';
    private const UTC = '2026-11-17T10:00:00Z';
    private PortalAuthority $authority;
    private int $courseSequence = 0;
    private int $lessonSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.foreign_key_constraints', true);
        DB::purge('sqlite');
        $this->artisan('migrate:fresh')->assertExitCode(0);
        foreach (['imagine-editorial', 'utc-company-a', 'utc-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => self::STORED, 'updated_at' => self::STORED,
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public int $checks = 0;
            public ?int $denyAtCheck = null;
            public ?PortalGrant $replacement = null;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                $identity = [
                    'editor' => ['imagine-editorial', 'utc-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['utc-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['utc-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['utc-company-a', 'another-person', PortalAccessGate::VIEW],
                ][$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return $this->replacement ?? PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
    }

    private function actAs(string $identity = 'student-a'): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial', 'student-b' => 'utc-company-b', default => 'utc-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'utc-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    /** Only fixtures use explicit IDs and bulk inserts; export still uses the real repository query. */
    private function fixture(int $count = 1, string $owner = 'imagine-editorial',
        string $status = 'published', bool $shared = true): array
    {
        $slug = 'utc-course-'.(++$this->courseSequence);
        $course = (int) DB::table('educational_courses')->insertGetId([
            'educational_organization_id' => $this->organization($owner), 'slug' => $slug,
            'title' => 'Título restrito', 'summary' => 'Resumo restrito', 'category' => 'metodologia',
            'is_shared' => $shared, 'is_published' => $status === 'published',
            'created_at' => self::STORED, 'updated_at' => self::STORED,
        ]);
        $version = (int) DB::table('educational_course_versions')->insertGetId([
            'educational_course_id' => $course, 'version' => 1, 'status' => $status,
            'created_at' => self::STORED, 'updated_at' => self::STORED,
        ]);
        $rows = $lessons = [];
        for ($index = 0; $index < $count; $index++) {
            $id = ++$this->lessonSequence;
            $lessons[] = $id;
            $rows[] = ['id' => $id, 'educational_course_version_id' => $version,
                'slug' => 'lesson-'.$id, 'title' => 'Aula restrita', 'body' => 'Corpo que nunca pertence à exportação.',
                'sort_order' => $index, 'is_published' => $status === 'published',
                'created_at' => self::STORED, 'updated_at' => self::STORED];
        }
        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('educational_lessons')->insert($chunk);
        }
        return compact('course', 'version', 'lessons', 'slug');
    }

    private function completion(int $lesson, string $at = self::STORED, string $identity = 'student-a'): int
    {
        return (int) DB::table('educational_lesson_progress')->insertGetId([
            'educational_organization_id' => $this->organization($identity === 'student-b' ? 'utc-company-b' : 'utc-company-a'),
            'subject_key' => $identity === 'colleague-a' ? 'another-person' : 'same-person',
            'educational_lesson_id' => $lesson, 'completed_at' => $at,
            'created_at' => self::STORED, 'updated_at' => self::STORED,
        ]);
    }

    private function envelope(array $rows = []): array
    {
        return ['schema_version' => 1, 'scope' => 'current_authenticated_student', 'completions' => $rows];
    }

    private function reference(string $course, int $lesson, string $date = self::UTC): array
    {
        return ['course_slug' => $course, 'course_version' => 1, 'lesson_slug' => 'lesson-'.$lesson, 'completed_at' => $date];
    }

    public function test_a_real_completion_exports_a_canonical_private_date_without_mutating_the_record(): void
    {
        $fixture = $this->fixture();
        $this->actAs();
        Carbon::setTestNow(new \DateTimeImmutable(self::UTC));
        try {
            $this->postJson('/universidade/private/lessons/'.$fixture['lessons'][0].'/complete')
                ->assertOk()->assertExactJson(['completed' => true]);
        } finally {
            Carbon::setTestNow();
        }
        $before = DB::table('educational_lesson_progress')->first();
        $response = $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
            $this->reference($fixture['slug'], $fixture['lessons'][0]),
        ]))->assertHeader('Content-Disposition', 'attachment; filename="imagine-universidade-progresso.json"');
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        self::assertEquals($before, DB::table('educational_lesson_progress')->first());
        self::assertSame(['course_slug', 'course_version', 'lesson_slug', 'completed_at'], array_keys($response->json('completions.0')));
    }

    public function test_legitimate_database_representations_share_utc_seconds_without_rewriting_storage(): void
    {
        $fixture = $this->fixture();
        $id = $this->completion($fixture['lessons'][0]);
        $this->actAs();
        foreach ([
            '2026-11-17 10:00:00' => self::UTC,
            '2026-11-17 10:00:00+00' => self::UTC,
            '2026-11-17 13:00:00+03' => self::UTC,
            '2026-11-17T05:00:00-05:00' => self::UTC,
            '2026-11-17T13:30:00.123456+0330' => self::UTC,
            '2026-11-17T15:30:00+05:30' => self::UTC,
            '2026-11-17T10:00:00Z' => self::UTC,
            '2026-01-01 00:30:00+02' => '2025-12-31T22:30:00Z',
        ] as $stored => $canonical) {
            DB::table('educational_lesson_progress')->where('id', $id)->update(['completed_at' => $stored]);
            $before = DB::table('educational_lesson_progress')->where('id', $id)->first();
            $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope([
                $this->reference($fixture['slug'], $fixture['lessons'][0], $canonical),
            ]));
            self::assertEquals($before, DB::table('educational_lesson_progress')->where('id', $id)->first());
        }
    }

    public function test_a_bad_date_after_valid_rows_refuses_the_whole_file_without_attachment_or_partial_data(): void
    {
        $fixture = $this->fixture(3);
        foreach ($fixture['lessons'] as $lesson) { $this->completion($lesson); }
        $this->actAs();
        foreach (['', 'invalid', '2026-02-30 10:00:00', '2026-11-17',
            '2026-11-17T10:00:00.1234567Z', '2026-11-17T10:00:00Z extra'] as $stored) {
            DB::table('educational_lesson_progress')->where('educational_lesson_id', $fixture['lessons'][1])
                ->update(['completed_at' => $stored]);
            $before = DB::table('educational_lesson_progress')->orderBy('id')->get()->all();
            $response = $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
            self::assertFalse($response->headers->has('Content-Disposition'));
            self::assertEquals($before, DB::table('educational_lesson_progress')->orderBy('id')->get()->all());
        }
    }

    public function test_canonicalization_remains_scoped_to_the_current_company_and_person(): void
    {
        $fixture = $this->fixture(3);
        foreach ([['student-a', 0, '2026-11-17 13:00:00+03'],
            ['student-b', 1, '2026-11-17 10:00:00+00'], ['colleague-a', 2, self::UTC]] as [$identity, $index, $date]) {
            $this->completion($fixture['lessons'][$index], $date, $identity);
        }
        foreach (['student-a', 'student-b', 'colleague-a'] as $index => $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL.'?company_id=utc-company-b&subject_key=another-person', [
                'X-Company-Id' => 'utc-company-b', 'X-Subject-Key' => 'another-person',
            ])->assertOk()->assertExactJson($this->envelope([
                $this->reference($fixture['slug'], $fixture['lessons'][$index]),
            ]));
        }
        DB::table('educational_lesson_progress')->where('educational_organization_id', $this->organization('utc-company-b'))
            ->update(['completed_at' => 'foreign invalid date']);
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertJsonCount(1, 'completions');
    }

    public function test_excluded_content_is_not_read_or_normalized_and_empty_remains_a_valid_export(): void
    {
        foreach ([$this->fixture(owner: 'utc-company-b'), $this->fixture(status: 'draft'), $this->fixture(shared: false)] as $excluded) {
            $this->completion($excluded['lessons'][0], 'excluded invalid date');
        }
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($this->envelope())
            ->assertHeader('Content-Disposition', 'attachment; filename="imagine-universidade-progresso.json"');
        self::assertSame(3, DB::table('educational_lesson_progress')->count());
    }

    public function test_withdrawal_and_republication_keep_the_original_reference_and_canonical_instant(): void
    {
        $fixture = $this->fixture();
        $this->completion($fixture['lessons'][0], '2026-11-17 13:00:00+03');
        $this->actAs();
        $expected = $this->envelope([$this->reference($fixture['slug'], $fixture['lessons'][0])]);
        $this->getJson(self::URL)->assertOk()->assertExactJson($expected);
        $before = DB::table('educational_lesson_progress')->get()->all();
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$fixture['course'].'/unpublish')->assertOk();
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($expected);
        $this->getJson('/universidade/private/lessons/'.$fixture['lessons'][0])->assertNotFound();
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$fixture['course'].'/publish')->assertOk();
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertExactJson($expected);
        self::assertEquals($before, DB::table('educational_lesson_progress')->get()->all());
    }

    public function test_five_thousand_is_complete_but_five_thousand_and_one_never_returns_a_partial_file(): void
    {
        $fixture = $this->fixture(5001);
        $org = $this->organization();
        foreach (array_chunk(array_slice($fixture['lessons'], 0, 5000), 50) as $chunk) {
            DB::table('educational_lesson_progress')->insert(array_map(static fn (int $lesson): array => [
                'educational_organization_id' => $org, 'subject_key' => 'same-person',
                'educational_lesson_id' => $lesson, 'completed_at' => '2026-11-17 13:00:00+03',
                'created_at' => self::STORED, 'updated_at' => self::STORED,
            ], $chunk));
        }
        $this->actAs();
        $this->getJson(self::URL)->assertOk()->assertJsonCount(5000, 'completions')
            ->assertJsonPath('completions.0.completed_at', self::UTC)
            ->assertJsonPath('completions.4999.completed_at', self::UTC);
        $this->completion($fixture['lessons'][5000]);
        $response = $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        self::assertFalse($response->headers->has('Content-Disposition'));
        self::assertSame(5001, DB::table('educational_lesson_progress')->count());
    }

    public function test_export_normalization_keeps_one_metadata_query_and_performs_no_business_write(): void
    {
        $fixture = $this->fixture(2);
        foreach ($fixture['lessons'] as $lesson) { $this->completion($lesson, '2026-11-17 13:00:00+03'); }
        $this->actAs();
        $queries = [];
        DB::listen(static function (QueryExecuted $query) use (&$queries): void { $queries[] = $query->sql; });
        $this->getJson(self::URL)->assertOk()->assertJsonCount(2, 'completions');
        $metadata = array_values(array_filter($queries, static fn (string $sql): bool => str_contains($sql, 'educational_lesson_progress')));
        self::assertCount(1, $metadata);
        self::assertStringContainsString('limit 5001', strtolower($metadata[0]));
        foreach ($queries as $sql) {
            self::assertMatchesRegularExpression('/^\s*select\b/i', $sql);
            self::assertDoesNotMatchRegularExpression('/title|body|summary|category|educational_course_favorites|educational_reading_positions|educational_audit/i', $sql);
        }
    }

    public function test_revocation_after_the_read_and_before_releasing_the_file_still_denies_every_reference(): void
    {
        $fixture = $this->fixture();
        $this->completion($fixture['lessons'][0], '2026-11-17 13:00:00+03');
        $this->actAs();
        $authority = $this->authority;
        DB::listen(static function (QueryExecuted $query) use ($authority): void {
            if (str_contains($query->sql, 'educational_lesson_progress')) { $authority->active = false; }
        });
        $response = $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertFalse($response->headers->has('Content-Disposition'));
        self::assertSame(1, DB::table('educational_lesson_progress')->count());
    }

    public function test_a_conversion_error_does_not_bypass_the_final_get_authority_check(): void
    {
        $fixture = $this->fixture();
        $this->completion($fixture['lessons'][0], 'invalid date');
        $this->actAs();
        $this->authority->checks = 0;
        $this->authority->denyAtCheck = 2;
        $response = $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(2, $this->authority->checks);
        self::assertFalse($response->headers->has('Content-Disposition'));
    }

    public function test_final_get_recheck_and_default_deny_all_remain_enforced_after_canonicalization(): void
    {
        $fixture = $this->fixture();
        $this->completion($fixture['lessons'][0]);
        $this->actAs();
        $this->authority->checks = 0;
        $this->authority->denyAtCheck = 3;
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(3, $this->authority->checks);
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
    }
}
