<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Learning\ReadingPositionRevision;
use App\Domain\Learning\UniversityCatalogRepository;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Real migrations, HTTP middleware and database; only the authority is synthetic. */
final class ReadingPositionFlowTest extends TestCase
{
    private const URL = '/universidade/private/reading-position';
    private const TABLE = 'educational_reading_positions';
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
        foreach (['imagine-editorial', 'reading-company-a', 'reading-company-b'] as $key) {
            DB::table('educational_organizations')->insert([
                'synthetic_key' => $key, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->authority = new class implements PortalAuthority {
            public bool $active = true;
            public bool $online = true;
            public int $checks = 0;
            public int $checksInsideTransaction = 0;
            public ?int $denyAtCheck = null;

            public function verify(string $credential, string $companyId, string $permission): PortalGrant
            {
                $this->checks++;
                if (DB::transactionLevel() > 0) {
                    $this->checksInsideTransaction++;
                }
                if (!$this->online) {
                    throw new RuntimeException('Synthetic authority unavailable');
                }
                $identity = [
                    'editor' => ['imagine-editorial', 'reading-editor', PortalAccessGate::MANAGE],
                    'student-a' => ['reading-company-a', 'same-person', PortalAccessGate::VIEW],
                    'student-b' => ['reading-company-b', 'same-person', PortalAccessGate::VIEW],
                    'colleague-a' => ['reading-company-a', 'another-person', PortalAccessGate::VIEW],
                    'manager-a' => ['reading-company-a', 'same-person', PortalAccessGate::MANAGE],
                ][$credential] ?? null;
                if (!$this->active || $this->checks === $this->denyAtCheck || $identity === null
                    || $identity[0] !== $companyId || $identity[2] !== $permission) {
                    return PortalGrant::deny('access_denied');
                }
                return PortalGrant::allow($identity[0], $identity[1], $identity[2], 1, time() + 30);
            }
        };
        $this->app->instance(PortalAuthority::class, $this->authority);
    }

    private function actAs(string $identity = 'student-a'): void
    {
        $company = match ($identity) {
            'editor' => 'imagine-editorial',
            'student-b' => 'reading-company-b',
            default => 'reading-company-a',
        };
        $this->withSession(['portal_server_credential' => $identity, 'portal_company_id' => $company]);
    }

    private function organization(string $key = 'reading-company-a'): int
    {
        return (int) DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
    }

    private function grant(): PortalGrant
    {
        return PortalGrant::allow('reading-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() + 30);
    }

    /** @return array{course_id:int,course_version:int,lesson_id:int} */
    private function course(bool $publish = true): array
    {
        $this->actAs('editor');
        $number = ++$this->courseSequence;
        $course = (int) $this->postJson('/universidade/private/admin/courses', [
            'slug' => 'reading-course-'.$number, 'title' => 'Título restrito '.$number,
            'category' => 'metodologia', 'summary' => 'Resumo privado que não deve ser exportado.',
        ])->assertCreated()->json('id');
        $lesson = (int) $this->postJson("/universidade/private/admin/courses/{$course}/lessons", [
            'slug' => 'exact-lesson', 'title' => 'Aula restrita',
            'body' => 'Conteúdo sintético que não pertence ao marcador ou à sua exportação.',
        ])->assertCreated()->json('id');
        if ($publish) {
            $this->postJson("/universidade/private/admin/courses/{$course}/publish")->assertOk();
        }
        return ['course_id' => $course, 'course_version' => 1, 'lesson_id' => $lesson];
    }

    private function current(): array
    {
        return $this->getJson(self::URL)->assertOk()->json();
    }

    private function save(array $target, ?string $revision = null): array
    {
        $revision ??= $this->current()['revision'];
        return $this->putJson(self::URL, [...$target, 'expected_revision' => $revision])->assertOk()->json();
    }

    private function privateRow(): array
    {
        return (array) DB::table(self::TABLE)->where('educational_organization_id', $this->organization())
            ->where('subject_key', 'same-person')->first();
    }

    public function test_initial_get_and_empty_export_never_create_a_slot_or_leak_identity(): void
    {
        $this->actAs();
        $mutations = [];
        DB::listen(static function (QueryExecuted $query) use (&$mutations): void {
            if (str_contains($query->sql, self::TABLE) && preg_match('/^\s*(insert|update|delete)/i', $query->sql)) {
                $mutations[] = $query->sql;
            }
        });
        $response = $this->getJson(self::URL)->assertOk();
        $body = $response->json();
        self::assertSame(['schema_version', 'scope', 'status', 'revision', 'position'], array_keys($body));
        self::assertSame(1, $body['schema_version']);
        self::assertSame('current_authenticated_student', $body['scope']);
        self::assertSame('none', $body['status']);
        self::assertNull($body['position']);
        self::assertStringStartsWith('a1.', $body['revision']);
        self::assertLessThanOrEqual(2048, strlen($body['revision']));
        self::assertStringNotContainsString('reading-company-a', $response->getContent());
        self::assertStringNotContainsString('same-person', $response->getContent());
        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->getJson(self::URL.'/export')->assertOk()->assertExactJson([
            'schema_version' => 1, 'scope' => 'current_authenticated_student', 'reading_position' => null,
        ])->assertHeader('Content-Disposition', 'attachment; filename="imagine-universidade-posicao-leitura.json"');
        self::assertSame([], $mutations);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_explicit_save_and_replacement_keep_one_position_and_do_not_complete_or_favorite(): void
    {
        $first = $this->course();
        $second = $this->course();
        $auditCount = DB::table('educational_audit_events')->count();
        $this->actAs();
        $initial = $this->current();
        $saved = $this->save($first, $initial['revision']);
        self::assertSame('available', $saved['status']);
        self::assertSame($first, array_intersect_key($saved['position'], $first));
        self::assertMatchesRegularExpression('/\Ar1\.[a-f0-9]{64}\z/', $saved['revision']);
        self::assertNotSame($initial['revision'], $saved['revision']);
        self::assertSame($saved, $this->current());
        $again = $this->save($first, $saved['revision']);
        self::assertNotSame($saved['revision'], $again['revision']);
        $replacement = $this->save($second, $again['revision']);
        self::assertSame($second, array_intersect_key($replacement['position'], $second));
        self::assertSame(1, DB::table(self::TABLE)->count());
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
        self::assertSame(0, DB::table('educational_course_favorites')->count());
        self::assertSame($auditCount, DB::table('educational_audit_events')->count());
    }

    public function test_company_person_and_forged_input_never_change_the_private_scope(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->actAs();
        $initial = $this->current()['revision'];
        $a = $this->putJson(self::URL, [...$first, 'expected_revision' => $initial,
            'company_id' => 'reading-company-b', 'subject_key' => 'another-person',
        ])->assertOk()->json();
        foreach (['student-b', 'colleague-a'] as $identity) {
            $this->actAs($identity);
            foreach ([$initial, $a['revision']] as $foreignRevision) {
                $this->putJson(self::URL, [...$second, 'expected_revision' => $foreignRevision])
                    ->assertStatus(409)->assertExactJson(['error' => 'reading_position_changed']);
            }
            self::assertSame('none', $this->current()['status']);
            $this->save($second);
        }
        $this->actAs();
        $this->withHeaders(['X-Company-Id' => 'reading-company-b', 'X-Subject-Id' => 'another-person'])
            ->getJson(self::URL.'?company_id=reading-company-b&subject_key=another-person')
            ->assertOk()->assertExactJson($a);
        self::assertSame(3, DB::table(self::TABLE)->count());
        $this->deleteJson(self::URL, ['expected_revision' => $a['revision'], 'company_id' => 'reading-company-b'])
            ->assertOk()->assertJsonPath('status', 'none');
        foreach (['student-b', 'colleague-a'] as $identity) {
            $this->actAs($identity);
            self::assertSame($second['lesson_id'], $this->current()['position']['lesson_id']);
        }
    }

    public function test_saved_at_is_canonical_utc_independent_of_database_offset_format(): void
    {
        $target = $this->course();
        $this->actAs();
        $saved = $this->save($target);
        self::assertMatchesRegularExpression('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/', $saved['position']['saved_at']);
        foreach (['2026-11-17 10:00:00+00', '2026-11-17 13:00:00+03', '2026-11-17T10:00:00Z'] as $stored) {
            DB::table(self::TABLE)->update(['saved_at' => $stored]);
            self::assertSame('2026-11-17T10:00:00Z', $this->current()['position']['saved_at']);
            $this->getJson(self::URL.'/export')->assertOk()
                ->assertJsonPath('reading_position.saved_at', '2026-11-17T10:00:00Z');
        }
    }

    public function test_drafts_foreign_nonshared_and_mismatched_exact_references_cannot_be_saved(): void
    {
        $valid = $this->course();
        $draft = $this->course(false);
        $nonshared = $this->course();
        $foreign = $this->course();
        DB::table('educational_courses')->where('id', $nonshared['course_id'])->update(['is_shared' => false]);
        DB::table('educational_courses')->where('id', $foreign['course_id'])->update([
            'educational_organization_id' => $this->organization('reading-company-b'),
        ]);
        $this->actAs();
        $revision = $this->current()['revision'];
        foreach ([$draft, $nonshared, $foreign,
            [...$valid, 'course_id' => 999999], [...$valid, 'course_version' => 2],
            [...$valid, 'lesson_id' => $draft['lesson_id']], [...$valid, 'lesson_id' => 999999],
        ] as $target) {
            $this->putJson(self::URL, [...$target, 'expected_revision' => $revision])->assertNotFound()
                ->assertExactJson(['error' => 'not_found']);
        }
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_malformed_requests_are_rejected_without_creating_state(): void
    {
        $target = $this->course();
        $this->actAs();
        $body = [...$target, 'expected_revision' => $this->current()['revision']];
        foreach ([[], [...$body, 'course_id' => 0], [...$body, 'course_version' => 1.5],
            [...$body, 'lesson_id' => 9007199254740992], [...$body, 'expected_revision' => []],
            [...$body, 'expected_revision' => str_repeat('x', 2049)],
        ] as $invalid) {
            $this->putJson(self::URL, $invalid)->assertStatus(422);
        }
        $this->deleteJson(self::URL, [])->assertStatus(422);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_absence_tickets_enforce_integrity_purpose_scope_revision_and_expiry(): void
    {
        $target = $this->course();
        $this->actAs();
        $tokens = $this->app->make(ReadingPositionRevision::class);
        $ticket = $this->current()['revision'];
        $payload = json_decode(Crypt::decryptString(substr($ticket, 3)), true, 8, JSON_THROW_ON_ERROR);
        $invalid = ['a1.invalid', $ticket.'x', $tokens->absent($this->grant(), time() - 300),
            $tokens->absent($this->grant(), time() + 60)];
        foreach (['purpose' => 'other-purpose', 'company' => 'reading-company-b', 'subject' => 'another-person',
            'permission' => PortalAccessGate::MANAGE, 'grant_revision' => 2,
            'expires_at' => time() + 86400,
        ] as $field => $value) {
            $invalid[] = 'a1.'.Crypt::encryptString(json_encode([...$payload, $field => $value], JSON_THROW_ON_ERROR));
        }
        foreach ($invalid as $revision) {
            $this->putJson(self::URL, [...$target, 'expected_revision' => $revision])->assertStatus(409)
                ->assertExactJson(['error' => 'reading_position_changed']);
        }
        self::assertFalse($tokens->matchesAbsence($ticket, $this->grant(), time() + 120 * 86400));
        self::assertSame(0, DB::table(self::TABLE)->count());
        $this->save($target, $ticket);
    }

    public function test_stale_updates_and_removals_conflict_instead_of_overwriting_new_state(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->actAs();
        $saved = $this->save($first);
        $twoReaders = [$this->current(), $this->current()];
        self::assertSame($twoReaders[0]['revision'], $twoReaders[1]['revision']);
        $changed = $this->save($second, $twoReaders[0]['revision']);
        $this->putJson(self::URL, [...$first, 'expected_revision' => $twoReaders[1]['revision']])
            ->assertStatus(409)->assertExactJson(['error' => 'reading_position_changed']);
        $this->deleteJson(self::URL, ['expected_revision' => $saved['revision']])->assertStatus(409);
        self::assertSame($changed, $this->current());
    }

    public function test_returning_to_the_same_lesson_or_an_empty_slot_never_reuses_revision(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->actAs();
        $initial = $this->current()['revision'];
        $a = $this->save($first, $initial);
        $b = $this->save($second, $a['revision']);
        $again = $this->save($first, $b['revision']);
        self::assertNotSame($a['revision'], $again['revision']);
        $this->putJson(self::URL, [...$second, 'expected_revision' => $a['revision']])->assertStatus(409);
        $empty = $this->deleteJson(self::URL, ['expected_revision' => $again['revision']])->assertOk()->json();
        self::assertSame('none', $empty['status']);
        self::assertNull($empty['position']);
        self::assertSame($empty, $this->current());
        self::assertSame(1, DB::table(self::TABLE)->count());
        self::assertNull($this->privateRow()['educational_lesson_id']);
        self::assertNull($this->privateRow()['saved_at']);
        foreach ([$initial, $a['revision'], $again['revision']] as $old) {
            $this->putJson(self::URL, [...$first, 'expected_revision' => $old])->assertStatus(409);
        }
        $newEmpty = $this->deleteJson(self::URL, ['expected_revision' => $empty['revision']])->assertOk()->json();
        self::assertNotSame($empty['revision'], $newEmpty['revision']);
        $this->save($second, $newEmpty['revision']);
    }

    public function test_old_stored_token_cannot_recreate_a_physically_removed_slot(): void
    {
        $target = $this->course();
        $this->actAs();
        $saved = $this->save($target);
        // Privileged fixture removal only. No runtime purger is introduced.
        DB::table(self::TABLE)->delete();
        $this->putJson(self::URL, [...$target, 'expected_revision' => $saved['revision']])->assertStatus(409);
        $this->deleteJson(self::URL, ['expected_revision' => $saved['revision']])->assertStatus(409);
        self::assertSame(0, DB::table(self::TABLE)->count());
        $tokens = $this->app->make(ReadingPositionRevision::class);
        $expiredInitial = $tokens->absent($this->grant(), time() - 120 * 86400);
        $this->putJson(self::URL, [...$target, 'expected_revision' => $expiredInitial])->assertStatus(409);
        $fresh = $this->save($target);
        self::assertNotSame($saved['revision'], $fresh['revision']);
        $this->deleteJson(self::URL, ['expected_revision' => $saved['revision']])->assertStatus(409);
        self::assertSame($fresh, $this->current());
    }

    public function test_withdrawal_and_republication_keep_the_exact_historical_reference_until_explicit_replacement(): void
    {
        $target = $this->course();
        $this->actAs();
        $saved = $this->save($target);
        DB::table(self::TABLE)->update(['saved_at' => now()->subDays(121)->toDateTimeString()]);
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$target['course_id'].'/unpublish')->assertOk();
        $this->actAs();
        $hidden = $this->current();
        self::assertSame('unavailable', $hidden['status']);
        self::assertNull($hidden['position']);
        self::assertSame($saved['revision'], $hidden['revision']);
        $this->getJson('/universidade/private/lessons/'.$target['lesson_id'])->assertNotFound();
        $export = $this->getJson(self::URL.'/export')->assertOk()->json();
        self::assertSame(['course_slug', 'course_version', 'lesson_slug', 'saved_at'], array_keys($export['reading_position']));
        self::assertSame('reading-course-1', $export['reading_position']['course_slug']);
        self::assertSame(1, $export['reading_position']['course_version']);
        self::assertSame('exact-lesson', $export['reading_position']['lesson_slug']);
        self::assertStringNotContainsString($saved['revision'], json_encode($export, JSON_THROW_ON_ERROR));
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$target['course_id'].'/publish')->assertOk();
        $this->actAs();
        self::assertSame($hidden, $this->current());
        $this->putJson(self::URL, [...$target, 'expected_revision' => $hidden['revision']])->assertNotFound();
        $newLesson = DB::table('educational_lessons as l')->join('educational_course_versions as v',
            'v.id', '=', 'l.educational_course_version_id')->where('v.educational_course_id', $target['course_id'])
            ->where('v.status', 'published')->value('l.id');
        self::assertNotSame($target['lesson_id'], (int) $newLesson);
        $updated = $this->save([...$target, 'course_version' => 2, 'lesson_id' => (int) $newLesson], $hidden['revision']);
        self::assertSame(2, $updated['position']['course_version']);
        self::assertSame(0, DB::table('educational_lesson_progress')->count());
    }

    public function test_unavailable_position_can_be_cleared_without_reading_course_content(): void
    {
        $target = $this->course();
        $this->actAs();
        $saved = $this->save($target);
        $this->actAs('editor');
        $this->postJson('/universidade/private/admin/courses/'.$target['course_id'].'/unpublish')->assertOk();
        $this->actAs();
        $contentReads = [];
        DB::listen(static function (QueryExecuted $query) use (&$contentReads): void {
            if (preg_match('/educational_(courses|course_versions|lessons)[" ]/', $query->sql)) {
                $contentReads[] = $query->sql;
            }
        });
        $this->deleteJson(self::URL, ['expected_revision' => $saved['revision']])->assertOk()
            ->assertJsonPath('status', 'none')->assertJsonPath('position', null);
        self::assertSame([], $contentReads);
        self::assertNull($this->privateRow()['educational_lesson_id']);
        $this->getJson(self::URL.'/export')->assertOk()->assertJsonPath('reading_position', null);
    }

    public function test_injected_draft_or_foreign_references_never_export_or_resume(): void
    {
        $valid = $this->course();
        $draft = $this->course(false);
        $foreign = $this->course();
        DB::table('educational_courses')->where('id', $foreign['course_id'])->update([
            'educational_organization_id' => $this->organization('reading-company-b'),
        ]);
        $this->actAs();
        $saved = $this->save($valid);
        foreach ([$draft, $foreign] as $target) {
            DB::table(self::TABLE)->update(['educational_lesson_id' => $target['lesson_id']]);
            $this->getJson(self::URL)->assertOk()->assertExactJson([
                'schema_version' => 1, 'scope' => 'current_authenticated_student',
                'status' => 'unavailable', 'revision' => $saved['revision'], 'position' => null,
            ]);
            $this->getJson(self::URL.'/export')->assertOk()->assertJsonPath('reading_position', null);
        }
    }

    public function test_editor_manager_guest_and_unavailable_authority_do_not_receive_private_state(): void
    {
        $target = $this->course();
        foreach (['editor', 'manager-a', 'unknown'] as $identity) {
            $this->actAs($identity);
            $this->getJson(self::URL)->assertForbidden();
            $this->getJson(self::URL.'/export')->assertForbidden();
            $this->putJson(self::URL, [...$target, 'expected_revision' => 'forged'])->assertForbidden();
            $this->deleteJson(self::URL, ['expected_revision' => 'forged'])->assertForbidden();
        }
        $this->actAs();
        $this->app->instance(PortalAuthority::class, new UnavailablePortalAuthority());
        $this->getJson(self::URL)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_revocation_during_target_read_prevents_initial_insert(): void
    {
        $target = $this->course();
        $this->actAs();
        $revision = $this->current()['revision'];
        $authority = $this->authority;
        $revoked = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$revoked): void {
            if (!$revoked && str_contains($query->sql, 'educational_course_versions')) {
                $revoked = true;
                $authority->active = false;
            }
        });
        $this->putJson(self::URL, [...$target, 'expected_revision' => $revision])->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($revoked);
        self::assertGreaterThan(0, $authority->checksInsideTransaction);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_revocation_during_replacement_or_removal_preserves_the_exact_existing_row(): void
    {
        $first = $this->course();
        $second = $this->course();
        $this->actAs();
        $saved = $this->save($first);
        $before = $this->privateRow();
        $authority = $this->authority;
        $armed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, self::TABLE)) {
                $armed = false;
                $authority->active = false;
            }
        });
        $armed = true;
        $this->putJson(self::URL, [...$second, 'expected_revision' => $saved['revision']])->assertForbidden();
        self::assertSame($before, $this->privateRow());
        $authority->active = true;
        $armed = true;
        $this->deleteJson(self::URL, ['expected_revision' => $saved['revision']])->assertForbidden();
        self::assertSame($before, $this->privateRow());
    }

    public function test_authority_revoked_after_a_contended_insert_rolls_back_the_new_slot(): void
    {
        $target = $this->course();
        $this->actAs();
        $ticket = $this->current()['revision'];
        $authority = $this->authority;
        $insertObserved = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$insertObserved): void {
            if (!$insertObserved && str_contains($query->sql, self::TABLE) && preg_match('/^\s*insert/i', $query->sql)) {
                $insertObserved = true;
                $authority->active = false;
            }
        });
        $before = $authority->checksInsideTransaction;
        $this->putJson(self::URL, [...$target, 'expected_revision' => $ticket])->assertForbidden()
            ->assertExactJson(['error' => 'access_denied']);
        self::assertTrue($insertObserved);
        self::assertSame($before + 2, $authority->checksInsideTransaction);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_internal_writes_require_a_matching_live_grant_and_do_not_trust_the_revision_as_authority(): void
    {
        $target = $this->course();
        $this->actAs();
        $tokens = $this->app->make(ReadingPositionRevision::class);
        $repository = $this->app->make(UniversityCatalogRepository::class);
        $grant = $this->grant();
        $ticket = $this->current()['revision'];
        $write = fn (?callable $fresh = null): array|string => $repository->saveReadingPosition(
            $grant, $target['course_id'], 1, $target['lesson_id'], $ticket, $tokens, $fresh,
        );
        self::assertSame('access_denied', $write());
        $wrong = [null, PortalGrant::deny(),
            PortalGrant::allow('reading-company-b', 'same-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('reading-company-a', 'another-person', PortalAccessGate::VIEW, 1, time() + 30),
            PortalGrant::allow('reading-company-a', 'same-person', PortalAccessGate::MANAGE, 1, time() + 30),
            PortalGrant::allow('reading-company-a', 'same-person', PortalAccessGate::VIEW, 2, time() + 30),
            PortalGrant::allow('reading-company-a', 'same-person', PortalAccessGate::VIEW, 1, time() - 1),
        ];
        foreach ($wrong as $fresh) {
            self::assertSame('access_denied', $write(static fn () => $fresh));
        }
        self::assertSame('access_denied', $write(static function (): never { throw new RuntimeException('Synthetic failure'); }));
        self::assertSame(0, DB::table(self::TABLE)->count());
        $saved = $write(static fn () => $grant);
        self::assertIsArray($saved);
        $before = $this->privateRow();
        self::assertSame('access_denied', $repository->clearReadingPosition($grant, $saved['revision'], $tokens));
        foreach ($wrong as $fresh) {
            self::assertSame('access_denied', $repository->clearReadingPosition($grant, $saved['revision'], $tokens, static fn () => $fresh));
        }
        self::assertSame($before, $this->privateRow());
    }

    public function test_revocation_during_get_or_export_withholds_data_without_erasing_the_preference(): void
    {
        $target = $this->course();
        $this->actAs();
        $this->save($target);
        $before = $this->privateRow();
        $authority = $this->authority;
        $armed = false;
        DB::listen(static function (QueryExecuted $query) use ($authority, &$armed): void {
            if ($armed && str_contains($query->sql, self::TABLE)) {
                $armed = false;
                $authority->active = false;
            }
        });
        foreach ([self::URL, self::URL.'/export'] as $url) {
            $authority->active = true;
            $armed = true;
            $response = $this->getJson($url)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertFalse($response->headers->has('Content-Disposition'));
            self::assertSame($before, $this->privateRow());
        }
    }

    public function test_final_get_boundary_rechecks_after_the_controller_for_snapshot_and_export(): void
    {
        $target = $this->course();
        $this->actAs();
        $this->save($target);
        foreach ([self::URL, self::URL.'/export'] as $url) {
            $this->authority->checks = 0;
            $this->authority->denyAtCheck = 3;
            $this->getJson($url)->assertForbidden()->assertExactJson(['error' => 'access_denied']);
            self::assertSame(3, $this->authority->checks);
        }
        self::assertSame(1, DB::table(self::TABLE)->count());
    }

    public function test_database_failure_is_not_an_empty_position_or_successful_write(): void
    {
        $target = $this->course();
        $this->actAs();
        $ticket = $this->current()['revision'];
        Schema::drop(self::TABLE);
        foreach ([self::URL, self::URL.'/export'] as $url) {
            $this->getJson($url)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        }
        $this->putJson(self::URL, [...$target, 'expected_revision' => $ticket])->assertStatus(503);
        $this->deleteJson(self::URL, ['expected_revision' => 'r1.'.str_repeat('a', 64)])->assertStatus(503);
    }

    public function test_missing_private_or_editorial_organization_is_unavailable_not_an_empty_preference(): void
    {
        $this->actAs();
        DB::table('educational_organizations')->where('synthetic_key', 'reading-company-a')->delete();
        $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
        $this->getJson(self::URL.'/export')->assertStatus(503);
        DB::table('educational_organizations')->insert([
            'synthetic_key' => 'reading-company-a', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('educational_organizations')->where('synthetic_key', 'imagine-editorial')->delete();
        $this->getJson(self::URL)->assertStatus(503);
        $this->getJson(self::URL.'/export')->assertStatus(503);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_exception_after_insert_rolls_back_instead_of_leaving_a_reported_failure_committed(): void
    {
        $target = $this->course();
        $this->actAs();
        $ticket = $this->current()['revision'];
        $thrown = false;
        DB::listen(static function (QueryExecuted $query) use (&$thrown): void {
            if (!$thrown && str_contains($query->sql, self::TABLE) && preg_match('/^\s*insert/i', $query->sql)) {
                $thrown = true;
                throw new RuntimeException('Synthetic post-insert failure');
            }
        });
        $this->putJson(self::URL, [...$target, 'expected_revision' => $ticket])->assertStatus(503);
        self::assertTrue($thrown);
        self::assertSame(0, DB::table(self::TABLE)->count());
    }

    public function test_malformed_stored_revision_or_partial_reference_fails_closed(): void
    {
        $target = $this->course();
        $this->actAs();
        $saved = $this->save($target);
        foreach ([['revision' => 'broken'], ['revision' => $saved['revision'], 'saved_at' => null]] as $changes) {
            DB::table(self::TABLE)->update($changes);
            $this->getJson(self::URL)->assertStatus(503)->assertExactJson(['error' => 'temporarily_unavailable']);
            $this->getJson(self::URL.'/export')->assertStatus(503);
        }
    }

    public function test_schema_has_only_the_private_slot_and_rejects_duplicate_owner_keys(): void
    {
        $columns = Schema::getColumnListing(self::TABLE);
        sort($columns);
        self::assertSame(['educational_lesson_id', 'educational_organization_id', 'revision', 'saved_at', 'subject_key'], $columns);
        $target = $this->course();
        $this->actAs();
        $this->save($target);
        try {
            DB::table(self::TABLE)->insert($this->privateRow());
            self::fail('The database must reject a second private position for the same company/person.');
        } catch (QueryException) {
            self::assertSame(1, DB::table(self::TABLE)->count());
        }
        foreach ([['educational_lessons', $target['lesson_id']], ['educational_organizations', $this->organization()]] as [$table, $id]) {
            try {
                DB::table($table)->where('id', $id)->delete();
                self::fail('Private position references must not be removed by cascading deletion.');
            } catch (QueryException) {
                self::assertSame(1, DB::table(self::TABLE)->count());
            }
        }
    }
}
