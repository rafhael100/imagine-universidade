<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\AccessSnapshot;
use App\Domain\Access\MockEntitlementPolicy;
use App\Domain\Learning\MockLessonProgress;
use PHPUnit\Framework\TestCase;

final class MockLessonProgressTest extends TestCase
{
    private MockLessonProgress $progress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->progress = new MockLessonProgress(new MockEntitlementPolicy());
    }

    private function eligible(array $overrides = []): AccessSnapshot
    {
        return new AccessSnapshot(...array_merge([
            'requestedCompanyId' => 'synthetic-org-A',
            'authorizedCompanyId' => 'synthetic-org-A',
            'subjectId' => 'synthetic-person-A',
            'entitlementRevision' => 4,
            'authorityVerified' => true,
            'identityVerified' => true,
            'companyLinkActive' => true,
            'resourcePermissionGranted' => true,
            'hasEligibleActiveService' => true,
            'trialOnly' => false,
            'revoked' => false,
        ], $overrides));
    }

    public function test_completion_is_idempotent_and_readable_only_in_eligible_context(): void
    {
        $ctx = $this->eligible();
        self::assertSame(
            ['ok' => true, 'code' => 'completed', 'already_completed' => false],
            $this->progress->complete($ctx, 'synthetic-org-A', 'lesson-01', true, true)
        );
        self::assertSame(
            ['ok' => true, 'code' => 'completed', 'already_completed' => true],
            $this->progress->complete($ctx, 'synthetic-org-A', 'lesson-01', true, true)
        );
        self::assertSame(
            ['ok' => true, 'code' => 'eligible', 'completed' => true],
            $this->progress->status($ctx, 'synthetic-org-A', 'lesson-01', true, true)
        );
    }

    public function test_draft_content_cannot_be_completed_or_read(): void
    {
        $ctx = $this->eligible();
        self::assertSame('not_published', $this->progress->complete(
            $ctx, 'synthetic-org-A', 'lesson-01', false, true
        )['code']);
        self::assertSame('not_published', $this->progress->status(
            $ctx, 'synthetic-org-A', 'lesson-01', true, false
        )['code']);
    }

    public function test_cross_company_reference_is_denied_without_mutation(): void
    {
        $ctx = $this->eligible();
        self::assertSame('wrong_company', $this->progress->complete(
            $ctx, 'synthetic-org-B', 'lesson-01', true, true
        )['code']);
        self::assertFalse($this->progress->status(
            $ctx, 'synthetic-org-A', 'lesson-01', true, true
        )['completed']);
    }

    public function test_revocation_and_authority_outage_block_access_to_previous_completion(): void
    {
        $ctx = $this->eligible();
        $this->progress->complete($ctx, 'synthetic-org-A', 'lesson-01', true, true);
        foreach ([
            [$this->eligible(['revoked' => true]), 'revoked'],
            [$this->eligible(['authorityVerified' => false]), 'authority_unavailable'],
            [$this->eligible(['trialOnly' => true]), 'not_eligible'],
            [$this->eligible(['identityVerified' => false]), 'unauthenticated'],
        ] as [$denied, $reason]) {
            $result = $this->progress->status($denied, 'synthetic-org-A', 'lesson-01', true, true);
            self::assertFalse($result['ok']);
            self::assertSame($reason, $result['code']);
            self::assertArrayNotHasKey('completed', $result);
        }
    }

    public function test_progress_isolated_by_person_and_lesson(): void
    {
        $this->progress->complete($this->eligible(), 'synthetic-org-A', 'lesson-01', true, true);
        self::assertFalse($this->progress->status(
            $this->eligible(['subjectId' => 'synthetic-person-B']),
            'synthetic-org-A', 'lesson-01', true, true
        )['completed']);
        self::assertFalse($this->progress->status(
            $this->eligible(), 'synthetic-org-A', 'lesson-02', true, true
        )['completed']);
    }

    public function test_invalid_lesson_identifier_is_denied(): void
    {
        self::assertSame('invalid_lesson', $this->progress->complete(
            $this->eligible(), 'synthetic-org-A', '../unsafe/id', true, true
        )['code']);
    }
}
