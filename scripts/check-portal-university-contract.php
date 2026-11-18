<?php

declare(strict_types=1);

/**
 * Pure cross-repository interoperability contract.
 *
 * Usage:
 *   PORTAL_CONTRACT_DIR=/path/to/reviewed/portal-checkout \
 *     php scripts/check-portal-university-contract.php
 *
 * A real read-only Portal source checkout is required. No HTTP, database,
 * Composer, secrets, API providers, payments, SSO, grants or deployments.
 * This is NOT an operational entitlement or authentication test.
 */

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use App\Domain\Authorization\AuthorizationContext;
use App\Domain\Authorization\OrganizationAuthorizationService;
use App\Domain\Authorization\Permission;
use App\Domain\Identity\PortalUserId;
use App\Domain\Organizations\MembershipStatus;
use App\Domain\Organizations\OrganizationId;
use App\Domain\Organizations\OrganizationMembership;
use App\Domain\Organizations\OrganizationRole;
use App\Domain\ServicePortfolio\PortfolioProduct;
use App\Domain\ServicePortfolio\UniversityCommercialEligibilityPreflight;
use App\Domain\ServicePortfolio\UniversityCommercialPolicyAuthority;
use App\Domain\ServicePortfolio\UniversityCommercialPolicySnapshot;
use App\Domain\ServicePortfolio\UniversityContractAuthority;
use App\Domain\ServicePortfolio\UniversityContractSnapshot;
use App\Domain\ServicePortfolio\UniversityContractStatus;
use App\Domain\ServicePortfolio\UniversityServiceCoverageAuthority;
use App\Domain\ServicePortfolio\UniversityServiceCoverageSnapshot;
use App\Domain\ServicePortfolio\UniversityServiceRevisionAuthority;
use App\Domain\ServicePortfolio\UniversityServiceRevisionSnapshot;
use App\Domain\ServicePortfolio\UniversityCoverageBasis;
use App\Domain\ServicePortfolio\UniversityInteropIdentifiers;

$root = getenv('PORTAL_CONTRACT_DIR');
if (!is_string($root) || $root === '' || ($root = realpath($root)) === false) {
    fwrite(STDERR, "HOLD cross-repo QA: explicitly checked-out Portal source required.\n");
    exit(2);
}

$portalApp = $root.'/apps/portal/app/';
foreach ([
    'Domain/Organizations/OrganizationId.php',
    'Domain/Identity/PortalUserId.php',
    'Domain/Authorization/Permission.php',
    'Domain/ServicePortfolio/UniversityInteropIdentifiers.php',
    'Domain/ServicePortfolio/UniversityCoverageBasis.php',
    'Domain/ServicePortfolio/UniversityCommercialEligibilityPreflight.php',
] as $source) {
    if (!is_file($portalApp.$source) || is_link($portalApp.$source)) {
        fwrite(STDERR, "HOLD cross-repo QA: Portal V4 contract file absent or linked: {$source}\n");
        exit(2);
    }
}

spl_autoload_register(static function (string $class) use ($portalApp): void {
    if (!str_starts_with($class, 'App\\')) {
        return;
    }
    $rel = str_replace('\\', '/', substr($class, 4));
    $file = $portalApp.$rel.'.php';
    if (is_file($file) && !is_link($file)) {
        require_once $file;
    }
});

$universityApp = dirname(__DIR__).'/app/Domain/Access/';
foreach ([
    'PortalGrant.php',
    'PortalAuthority.php',
    'UnavailablePortalAuthority.php',
    'PortalAccessGate.php',
    'PortalSignedClaimCandidate.php',
] as $source) {
    require_once $universityApp.$source;
}

$checked = 0;
$assert = static function (bool $condition, string $label) use (&$checked): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL Portal–Universidade contract: {$label}\n");
        exit(1);
    }
    ++$checked;
};

$assert(Permission::ViewUniversity->value === PortalAccessGate::VIEW, 'VIEW vocabulary parity');
$assert(Permission::ManageUniversity->value === PortalAccessGate::MANAGE, 'MANAGE vocabulary parity');
$assert(Permission::tryFrom('university:*') === null, 'no wildcard permission');

$authority = new class implements PortalAuthority {
    public int $verifications = 0;
    public string $subject = 'synthetic-user';

    public function verify(string $credential, string $organization, string $permission): PortalGrant
    {
        ++$this->verifications;
        return PortalGrant::allow($organization, $this->subject, $permission, 7, time() + 30);
    }
};
$gate = new PortalAccessGate($authority);

foreach ([1, 79, 80, 81, 120, 128] as $size) {
    $organization = new OrganizationId(str_repeat('o', $size));
    $compatible = $size <= 80;
    $assert(UniversityInteropIdentifiers::supportsOrganization($organization) === $compatible,
        "organization interop boundary at {$size}");

    $before = $authority->verifications;
    $grant = $gate->authorize('synthetic-server-session', $organization->value, PortalAccessGate::VIEW, time());
    $assert($grant->allowed === $compatible, "University gate company boundary at {$size}");
    if (!$compatible) {
        $assert($grant->reasonCode === 'invalid_context', "bad company denied before Portal at {$size}");
        $assert($before === $authority->verifications, "bad company made no authority call at {$size}");
    }
}

foreach ([1, 119, 120, 121, 127, 128] as $size) {
    $subject = new PortalUserId(str_repeat('u', $size));
    $compatible = $size <= 120;
    $assert(UniversityInteropIdentifiers::supportsSubject($subject) === $compatible,
        "subject interop boundary at {$size}");

    $authority->subject = $subject->value;
    $grant = $gate->authorize('synthetic-server-session', 'synthetic-company', PortalAccessGate::VIEW, time());
    $assert($grant->allowed === $compatible, "University gate subject boundary at {$size}");
    if (!$compatible) {
        $assert($grant->reasonCode === 'invalid_grant', "oversized subject denied at {$size}");
    }
}

$assert(!(new PortalAccessGate(new UnavailablePortalAuthority()))
    ->authorize('synthetic-server-session', 'synthetic-company', PortalAccessGate::VIEW, time())->allowed,
    'University production-default authority denied');
$assert(!(new UniversityCommercialEligibilityPreflight())
    ->inspect(new OrganizationId('synthetic-company'), time())->mayIssuePortalGrant(),
    'Portal production-default commercial eligibility denied');

$assert(!UniversityInteropIdentifiers::mayIssueGrant(), 'Portal identifier compatibility cannot grant');
$assert(!UniversityCoverageBasis::InstallationPaymentOnly->isCurrentServiceCandidate(),
    'installation settlement cannot establish ongoing service');
$assert(!UniversityCoverageBasis::WebhookEventOnly->isCurrentServiceCandidate(),
    'webhook cannot establish ongoing service');
$assert(!UniversityCoverageBasis::Unverified->isCurrentServiceCandidate(),
    'unverified coverage must remain blocked');

$organization = new OrganizationId('synthetic-company');
$actor = new PortalUserId('synthetic-user');
$membership = new OrganizationMembership(
    $actor, $organization, OrganizationRole::Owner, MembershipStatus::Active,
    [Permission::ViewUniversity, Permission::ManageUniversity], 9,
);
foreach ([Permission::ViewUniversity, Permission::ManageUniversity] as $permission) {
    $decision = (new OrganizationAuthorizationService())->decide(
        new AuthorizationContext($actor, $organization, $organization, $permission->value),
        $membership,
    );
    $assert(!$decision->allowed, "Portal owner/permissions alone never authorize {$permission->value}");
}

$claim = new \App\Domain\Access\PortalSignedClaimCandidate(
    'synthetic-company', 'synthetic-user', PortalAccessGate::VIEW, 7,
    time(), time() + 30, str_repeat('a', 32),
);
$assert(!$claim->mayAuthorizeAccess(), 'signed claim candidate cannot authorize');
$assert(!$claim->provesActiveService(), 'signed claim candidate cannot prove contract');
$assert(!$claim->provesSessionNotRevoked(), 'signed claim candidate cannot prove non-revocation');


/**
 * UNI C-155: read the REAL pinned Portal V4 classes with four independent
 * synthetic data providers. This is contract parity, NEVER an access issuer.
 * The University production binding remains UnavailablePortalAuthority.
 */
$now = time();
$tenant = new OrganizationId('synthetic-company');
$service = 'svc-onepage-synthetic';
$sku = 'onepage-basic-synthetic';
$contract = new UniversityContractSnapshot(
    $service, $tenant, PortfolioProduct::Onepage, UniversityContractStatus::Active,
    true, false, 7, $now - 5, $now + 30,
);
$revision = new UniversityServiceRevisionSnapshot(
    $tenant, [$service => 7], [], $now - 5, $now + 30,
);
$policy = new UniversityCommercialPolicySnapshot(
    4, [PortfolioProduct::Onepage->value => [$sku]],
    $now - 120, $now + 3600, $now - 5, $now + 30,
);
$coverageFor = static fn (
    UniversityCoverageBasis $basis = UniversityCoverageBasis::RecurringContractWindow,
    ?OrganizationId $organization = null,
    int $contractRevision = 7,
    int $policyRevision = 4,
    ?string $plan = null,
): UniversityServiceCoverageSnapshot => new UniversityServiceCoverageSnapshot(
    $service, $organization ?? $tenant, PortfolioProduct::Onepage, $plan ?? $sku,
    $contractRevision, $policyRevision,
    $now - 60, $now + 60, $now - 5, $now + 30, $basis,
);

$validSources = [
    'contracts' => [$contract],
    'revisions' => $revision,
    'policy' => $policy,
    'coverage' => [$coverageFor()],
];

/**
 * @param array{contracts:?array,revisions:?UniversityServiceRevisionSnapshot,
 *               policy:?UniversityCommercialPolicySnapshot,coverage:?array} $sources
 */
$preflightFrom = static function (array $sources): UniversityCommercialEligibilityPreflight {
    return new UniversityCommercialEligibilityPreflight(
        new class($sources['contracts']) implements UniversityContractAuthority {
            public function __construct(private ?array $records)
            {
            }

            public function currentFor(OrganizationId $organization): ?array
            {
                return $this->records;
            }
        },
        new class($sources['revisions']) implements UniversityServiceRevisionAuthority {
            public function __construct(private ?UniversityServiceRevisionSnapshot $revision)
            {
            }

            public function currentFor(OrganizationId $organization): ?UniversityServiceRevisionSnapshot
            {
                return $this->revision;
            }
        },
        new class($sources['policy']) implements UniversityCommercialPolicyAuthority {
            public function __construct(private ?UniversityCommercialPolicySnapshot $policy)
            {
            }

            public function currentFor(OrganizationId $organization): ?UniversityCommercialPolicySnapshot
            {
                return $this->policy;
            }
        },
        new class($sources['coverage']) implements UniversityServiceCoverageAuthority {
            public function __construct(private ?array $coverage)
            {
            }

            public function currentFor(OrganizationId $organization): ?array
            {
                return $this->coverage;
            }
        },
    );
};

$complete = $preflightFrom($validSources)->inspect($tenant, $now);
$assert($complete->reason === 'candidate_pending_official_authority' && $complete->candidateCount === 1,
    'matching V4 synthetic data only yields a diagnostic candidate');
$assert(!$complete->mayIssuePortalGrant() && !$complete->provesPaidContract(),
    'four matching synthetic sources still cannot issue a grant or prove payment');

foreach (array_keys($validSources) as $missing) {
    $sources = $validSources;
    $sources[$missing] = null;
    $result = $preflightFrom($sources)->inspect($tenant, $now);
    $assert($result->reason === 'source_unavailable' && $result->candidateCount === 0,
        "missing {$missing} source fails closed independently");
    $assert(!$result->mayIssuePortalGrant() && !$result->provesPaidContract(),
        "missing {$missing} source never becomes authority");
}

$negativeCoverage = [
    'installation_only' => [$coverageFor(UniversityCoverageBasis::InstallationPaymentOnly), 'coverage_not_authoritative'],
    'webhook_only' => [$coverageFor(UniversityCoverageBasis::WebhookEventOnly), 'coverage_not_authoritative'],
    'unsupported_grace' => [$coverageFor(UniversityCoverageBasis::ApprovedGraceWindow), 'grace_not_approved'],
    'wrong_contract_revision' => [$coverageFor(contractRevision: 6), 'contract_policy_revision_mismatch'],
    'wrong_policy_revision' => [$coverageFor(policyRevision: 3), 'contract_policy_revision_mismatch'],
    'wrong_coverage_tenant' => [$coverageFor(organization: new OrganizationId('other-company')), 'wrong_coverage_tenant'],
    'unapproved_sku' => [$coverageFor(plan: 'not-in-policy'), 'sku_not_approved'],
    'no_coverage' => [null, 'missing_active_service_coverage'],
];
foreach ($negativeCoverage as $scenario => [$badCoverage, $expectedReason]) {
    $sources = $validSources;
    $sources['coverage'] = $badCoverage === null ? [] : [$badCoverage];
    $result = $preflightFrom($sources)->inspect($tenant, $now);
    $assert($result->reason === $expectedReason && $result->candidateCount === 0,
        "V4 {$scenario} blocked with the expected reason");
    $assert(!$result->mayIssuePortalGrant() && !$result->provesPaidContract(),
        "V4 {$scenario} never confers authority");
}

// Distinguish an authoritative EMPTY service list from an unavailable feed.
// Both deny live access; only the diagnostic reason differs.
$noServices = $validSources;
$noServices['contracts'] = [];
$noServices['revisions'] = new UniversityServiceRevisionSnapshot(
    $tenant, [], [], $now - 5, $now + 30,
);
$noServices['coverage'] = [];
$empty = $preflightFrom($noServices)->inspect($tenant, $now);
$assert($empty->reason === 'contract_no_eligible_service' && $empty->candidateCount === 0,
    'Portal V4 empty portfolio uses contract_no_eligible_service');
$assert(!$empty->mayIssuePortalGrant(),
    'empty service portfolio does not issue a Portal grant');

echo "PASS: {$checked} actual Portal/Universidade cross-repo compatibility and deny-all checks; no grants or network.\n";
