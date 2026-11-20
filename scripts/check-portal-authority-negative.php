<?php

declare(strict_types=1);

/**
 * UNI ERD-R127/R128: dependency-free trust-boundary regression.
 * Synthetic authorities only; NEVER an operational Portal grant or SSO.
 */
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';
require_once __DIR__.'/../app/Domain/Access/UnavailablePortalAuthority.php';

use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\UnavailablePortalAuthority;

function syntheticAuthority(Closure $fn): PortalAuthority
{
    return new class($fn) implements PortalAuthority {
        public function __construct(private Closure $fn)
        {
        }

        public function verify(string $session, string $company, string $permission): PortalGrant
        {
            return ($this->fn)($session, $company, $permission);
        }
    };
}

$now = 1794750000;
$session = 'synthetic-server-session';
$company = 'synthetic-company';
$view = PortalAccessGate::VIEW;
$manage = PortalAccessGate::MANAGE;
$checks = 0;
$expect = static function (
    string $label, PortalAuthority $authority, string $permission,
    string $reason, int $budgetMs = 1500
) use ($now, $session, $company, &$checks): void {
    $result = (new PortalAccessGate($authority, $budgetMs))
        ->authorize($session, $company, $permission, $now);
    if ($result->allowed || $result->reasonCode !== $reason) {
        throw new RuntimeException($label.': expected '.$reason.', received '.$result->reasonCode);
    }
    ++$checks;
};

$expect('default view deny', new UnavailablePortalAuthority(), $view, 'authority_unavailable');
$expect('default manage deny', new UnavailablePortalAuthority(), $manage, 'authority_unavailable');
$expect('explicit revocation', syntheticAuthority(
    static fn (...$args) => PortalGrant::deny('revoked')
), $view, 'revoked');
$expect('upstream unavailable exception', syntheticAuthority(
    static function (...$args): PortalGrant {
        throw new RuntimeException('synthetic upstream down');
    }
), $view, 'authority_unavailable');
$expect('cross-tenant grant', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('other-company', 'synthetic-user',
        PortalAccessGate::VIEW, 4, 1794750030)
), $view, 'wrong_company');
$expect('view cannot manage', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'synthetic-user',
        PortalAccessGate::VIEW, 4, 1794750030)
), $manage, 'missing_permission');
$expect('zero revision', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'synthetic-user',
        PortalAccessGate::VIEW, 0, 1794750030)
), $view, 'invalid_grant');
$expect('empty subject', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', '',
        PortalAccessGate::VIEW, 4, 1794750030)
), $view, 'invalid_grant');
$expect('untrusted Unicode subject', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'subject-ç',
        PortalAccessGate::VIEW, 4, 1794750030)
), $view, 'invalid_grant');
$expect('stale expiration', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'synthetic-user',
        PortalAccessGate::VIEW, 4, 1794749999)
), $view, 'expired');
$expect('TTL beyond maximum', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'synthetic-user',
        PortalAccessGate::VIEW, 4, 1794750061)
), $view, 'invalid_grant');
$expect('conservative expiring-now grant', syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company', 'synthetic-user',
        PortalAccessGate::VIEW, 4, 1794750001)
), $view, 'expired');
$expect('authority budget expired', syntheticAuthority(
    static function (...$args): PortalGrant {
        usleep(30000); // 30 ms deterministic margin over 2 ms test budget.
        return PortalGrant::allow('synthetic-company', 'synthetic-user',
            PortalAccessGate::VIEW, 4, 1794750030);
    }
), $view, 'authority_timeout', 2);

$calls = 0;
$never = syntheticAuthority(
    static function (...$args) use (&$calls): PortalGrant {
        ++$calls;
        return PortalGrant::allow('synthetic-company', 'synthetic-user',
            PortalAccessGate::VIEW, 4, 1794750030);
    }
);
$gate = new PortalAccessGate($never);
foreach ([
    ['','synthetic-company',$view,$now],
    ['synthetic-session','tenant@invalid',$view,$now],
    ['synthetic-session','synthetic-company','university:*',$now],
    ['synthetic-session','synthetic-company',$view,0],
] as $invalid) {
    $result = $gate->authorize(...$invalid);
    if ($result->allowed || $result->reasonCode !== 'invalid_context') {
        throw new RuntimeException('Malformed context was not denied before upstream');
    }
    ++$checks;
}
if ($calls !== 0) {
    throw new RuntimeException('Malformed context reached authority');
}
foreach ([0,5001] as $badBudget) {
    try {
        new PortalAccessGate($never,$badBudget);
        throw new RuntimeException('Invalid verification budget accepted');
    } catch (InvalidArgumentException) {
        ++$checks;
    }
}
// A synthetic allow proves the guard contract only, never business eligibility.
$syntheticGood = syntheticAuthority(
    static fn (...$args) => PortalGrant::allow('synthetic-company','synthetic-user',
        PortalAccessGate::VIEW,4,1794750030)
);
$result=(new PortalAccessGate($syntheticGood))->authorize($session,$company,$view,$now);
if (!$result->allowed || $result->subjectId !== 'synthetic-user') {
    throw new RuntimeException('Regression in isolated allowed-candidate test');
}
++$checks;

echo 'PASS UNI R127/R128: '.$checks.
    ' synthetic Portal boundary scenarios; timeout, wrong tenant, revoked, expired, '.
    'invalid context and production default deny verified. No real SSO or grants.'.PHP_EOL;
