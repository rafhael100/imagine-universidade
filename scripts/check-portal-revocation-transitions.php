<?php

declare(strict_types=1);

/**
 * UNI ERD-R170/R171: a previously accepted synthetic candidate must never
 * survive cancellation, revocation, tenant change or authority failure.
 * No SSO, HTTP, actual contract, customer account or operational grant.
 */
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';
require_once __DIR__.'/../app/Domain/Access/UnavailablePortalAuthority.php';

use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\UnavailablePortalAuthority;

$now = 1794750000;
$authority = new class implements PortalAuthority {
    public string $state = 'active';
    public int $calls = 0;

    public function verify(string $session, string $company, string $permission): PortalGrant
    {
        ++$this->calls;
        if ($session !== 'synthetic-server-session') {
            throw new RuntimeException('Unexpected synthetic session input');
        }

        return match ($this->state) {
            'active' => PortalGrant::allow('synthetic-company', 'synthetic-subject',
                PortalAccessGate::VIEW, 3, 1794750030),
            'reactivated' => PortalGrant::allow('synthetic-company', 'synthetic-subject',
                PortalAccessGate::VIEW, 4, 1794750030),
            'last_service_cancelled' => PortalGrant::deny('last_service_cancelled'),
            'revoked' => PortalGrant::deny('revoked'),
            'suspended' => PortalGrant::deny('service_suspended'),
            'unknown' => PortalGrant::deny('authority_unavailable'),
            'wrong_company' => PortalGrant::allow('different-synthetic-company',
                'synthetic-subject', PortalAccessGate::VIEW, 4, 1794750030),
            'wrong_permission' => PortalGrant::allow('synthetic-company',
                'synthetic-subject', PortalAccessGate::MANAGE, 4, 1794750030),
            'expired' => PortalGrant::allow('synthetic-company',
                'synthetic-subject', PortalAccessGate::VIEW, 4, 1794749999),
            'invalid_revision' => PortalGrant::allow('synthetic-company',
                'synthetic-subject', PortalAccessGate::VIEW, 0, 1794750030),
            'timeout' => $this->slowSyntheticCandidate(),
            'exception' => throw new RuntimeException('Synthetic authority is offline'),
            default => throw new RuntimeException('Unrecognized synthetic test state'),
        };
    }

    private function slowSyntheticCandidate(): PortalGrant
    {
        usleep(30_000);
        return PortalGrant::allow('synthetic-company', 'synthetic-subject',
            PortalAccessGate::VIEW, 4, 1794750030);
    }
};

$checks = 0;
$gate = new PortalAccessGate($authority);
$check = static function (
    string $state, string $expectedReason, bool $allow = false,
    string $permission = PortalAccessGate::VIEW, ?PortalAccessGate $gateOverride = null
) use ($authority, $gate, $now, &$checks): void {
    $authority->state = $state;
    $before = $authority->calls;
    $result = ($gateOverride ?? $gate)->authorize(
        'synthetic-server-session', 'synthetic-company', $permission, $now
    );
    if ($authority->calls !== $before + 1) {
        throw new RuntimeException($state.': every request must recheck authority exactly once');
    }
    if ($result->allowed !== $allow || $result->reasonCode !== $expectedReason) {
        throw new RuntimeException($state.': expected '.
            ($allow ? 'synthetic accepted candidate' : $expectedReason).
            ' but got '.$result->reasonCode);
    }
    if (!$allow && (
        $result->companyId !== '' || $result->subjectId !== '' ||
        $result->revision !== 0 || $result->expiresAtEpoch !== 0
    )) {
        throw new RuntimeException($state.': denied decision leaked candidate attributes');
    }
    ++$checks;
};

// A synthetic accepted fixture is not proof of any active Imagine service.
$check('active', 'authorized', true);
// R170: cancellation/revocation must recheck, not reuse the previous allow.
$check('last_service_cancelled', 'last_service_cancelled');
$check('revoked', 'revoked');
$check('suspended', 'service_suspended');
$check('unknown', 'authority_unavailable');
$check('exception', 'authority_unavailable');
// R171: reactivation requires a new check, never "unsuspend" cached grants.
$check('reactivated', 'authorized', true);
$check('wrong_company', 'wrong_company');
$check('wrong_permission', 'missing_permission');
$check('expired', 'expired');
$check('invalid_revision', 'invalid_grant');
$check('active', 'missing_permission', false, PortalAccessGate::MANAGE);
$check('timeout', 'authority_timeout', false, PortalAccessGate::VIEW,
    new PortalAccessGate($authority, 2));

// R172: malformed context must never even contact the changing authority.
$before = $authority->calls;
foreach ([
    ['', 'synthetic-company', PortalAccessGate::VIEW, $now],
    ["fake\nheader", 'synthetic-company', PortalAccessGate::VIEW, $now],
    ['synthetic-server-session', 'other@tenant', PortalAccessGate::VIEW, $now],
    ['synthetic-server-session', 'synthetic-company', 'university:*', $now],
] as $args) {
    $result = $gate->authorize(...$args);
    if ($result->allowed || $result->reasonCode !== 'invalid_context') {
        throw new RuntimeException('Invalid context was not denied');
    }
    ++$checks;
}
if ($authority->calls !== $before) {
    throw new RuntimeException('Invalid context queried the authority');
}

// The production default remains deny-all for VIEW and MANAGE.
foreach ([PortalAccessGate::VIEW, PortalAccessGate::MANAGE] as $permission) {
    $result = (new PortalAccessGate(new UnavailablePortalAuthority()))
        ->authorize('synthetic-server-session', 'synthetic-company', $permission, $now);
    if ($result->allowed || $result->reasonCode !== 'authority_unavailable') {
        throw new RuntimeException('Production default Portal authority must deny');
    }
    ++$checks;
}
if ($authority->calls !== 13) {
    throw new RuntimeException('Unexpected trusted-boundary read count');
}
echo 'PASS UNI R170-R172: '.$checks.' synthetic transition/negative cases, '.
    '13 fresh authority reads, real default deny, no customer grant.'.PHP_EOL;
