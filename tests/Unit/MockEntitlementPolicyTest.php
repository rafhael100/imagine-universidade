<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\AccessSnapshot;
use App\Domain\Access\MockEntitlementPolicy;
use PHPUnit\Framework\TestCase;

final class MockEntitlementPolicyTest extends TestCase
{
    private MockEntitlementPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new MockEntitlementPolicy();
    }

    private function eligible(array $overrides = []): AccessSnapshot
    {
        $values = array_merge([
            'requestedCompanyId' => 'synthetic-company-A',
            'authorizedCompanyId' => 'synthetic-company-A',
            'subjectId' => 'synthetic-subject-1',
            'entitlementRevision' => 1,
            'authorityVerified' => true,
            'identityVerified' => true,
            'companyLinkActive' => true,
            'resourcePermissionGranted' => true,
            'hasEligibleActiveService' => true,
            'trialOnly' => false,
            'revoked' => false,
        ], $overrides);

        return new AccessSnapshot(...$values);
    }

    public function test_grants_only_when_all_requirements_are_explicitly_valid(): void
    {
        $decision = $this->policy->evaluate($this->eligible());

        self::assertTrue($decision->allowed);
        self::assertSame('eligible', $decision->reasonCode);
    }

    public function test_trial_without_active_paid_eligible_service_is_denied(): void
    {
        $decision = $this->policy->evaluate($this->eligible([
            'trialOnly' => true,
            'hasEligibleActiveService' => false,
        ]));

        self::assertFalse($decision->allowed);
        self::assertSame('not_eligible', $decision->reasonCode);
    }

    public function test_unavailable_authority_denies_new_grants(): void
    {
        $decision = $this->policy->evaluate($this->eligible(['authorityVerified' => false]));

        self::assertFalse($decision->allowed);
        self::assertSame('authority_unavailable', $decision->reasonCode);
    }

    public function test_revoke_denies_even_if_other_attributes_are_positive(): void
    {
        $decision = $this->policy->evaluate($this->eligible(['revoked' => true]));

        self::assertFalse($decision->allowed);
        self::assertSame('revoked', $decision->reasonCode);
    }

    public function test_cross_company_context_is_denied(): void
    {
        $decision = $this->policy->evaluate($this->eligible([
            'authorizedCompanyId' => 'synthetic-company-B',
        ]));

        self::assertFalse($decision->allowed);
        self::assertSame('wrong_company', $decision->reasonCode);
    }

    public function test_missing_revision_is_denied(): void
    {
        $decision = $this->policy->evaluate($this->eligible(['entitlementRevision' => 0]));

        self::assertFalse($decision->allowed);
        self::assertSame('invalid_context', $decision->reasonCode);
    }

    public function test_missing_link_or_permission_is_denied(): void
    {
        self::assertFalse($this->policy->evaluate(
            $this->eligible(['companyLinkActive' => false])
        )->allowed);

        self::assertFalse($this->policy->evaluate(
            $this->eligible(['resourcePermissionGranted' => false])
        )->allowed);
    }
}
