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

    public function test_fail_closed_matrix_for_last_service_and_invalid_session_context(): void
    {
        // Synthetic representation of the Portal #886 contract; no real service is queried.
        $cases = [
            'last_service_cancelled' => [['hasEligibleActiveService' => false], 'not_eligible'],
            'trial_only_despite_service_flag' => [['trialOnly' => true], 'not_eligible'],
            'revoked_company' => [['revoked' => true], 'revoked'],
            'portal_timeout_or_failure' => [['authorityVerified' => false], 'authority_unavailable'],
            'subject_not_authenticated' => [['identityVerified' => false], 'unauthenticated'],
            'company_link_removed' => [['companyLinkActive' => false], 'link_not_active'],
            'resource_access_removed' => [['resourcePermissionGranted' => false], 'missing_permission'],
            'tenant_switched' => [['requestedCompanyId' => 'synthetic-company-B'], 'wrong_company'],
            'missing_subject' => [['subjectId' => ' '], 'invalid_context'],
            'missing_company' => [['requestedCompanyId' => ' '], 'invalid_context'],
            'invalid_revision' => [['entitlementRevision' => -1], 'invalid_context'],
        ];

        foreach ($cases as $label => [$overrides, $reason]) {
            $decision = $this->policy->evaluate($this->eligible($overrides));
            self::assertFalse($decision->allowed, $label);
            self::assertSame($reason, $decision->reasonCode, $label);
        }
    }
}
