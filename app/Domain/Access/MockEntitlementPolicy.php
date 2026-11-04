<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Política simulada C-00. NÃO É um autorizador de produção.
 * O direito oficial pertence ao Portal/autorizador central Imagine.
 */
final class MockEntitlementPolicy
{
    public function evaluate(AccessSnapshot $snapshot): AccessDecision
    {
        if (
            trim($snapshot->requestedCompanyId) === '' ||
            trim($snapshot->authorizedCompanyId) === '' ||
            trim($snapshot->subjectId) === '' ||
            $snapshot->entitlementRevision <= 0
        ) {
            return AccessDecision::deny('invalid_context', $snapshot->entitlementRevision);
        }

        if (!$snapshot->authorityVerified) {
            return AccessDecision::deny('authority_unavailable', $snapshot->entitlementRevision);
        }

        if ($snapshot->requestedCompanyId !== $snapshot->authorizedCompanyId) {
            return AccessDecision::deny('wrong_company', $snapshot->entitlementRevision);
        }

        if (!$snapshot->identityVerified) {
            return AccessDecision::deny('unauthenticated', $snapshot->entitlementRevision);
        }

        if (!$snapshot->companyLinkActive) {
            return AccessDecision::deny('link_not_active', $snapshot->entitlementRevision);
        }

        if (!$snapshot->resourcePermissionGranted) {
            return AccessDecision::deny('missing_permission', $snapshot->entitlementRevision);
        }

        if ($snapshot->revoked) {
            return AccessDecision::deny('revoked', $snapshot->entitlementRevision);
        }

        if ($snapshot->trialOnly || !$snapshot->hasEligibleActiveService) {
            return AccessDecision::deny('not_eligible', $snapshot->entitlementRevision);
        }

        return AccessDecision::allow($snapshot->entitlementRevision);
    }
}
