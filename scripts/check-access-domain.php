<?php

declare(strict_types=1);

/**
 * University pure-PHP access-contract smoke suite.
 * No Composer, database, HTTP, production credentials or real Portal required.
 * Run: php scripts/check-access-domain.php
 */

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;

require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/UnavailablePortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';

const NOW = 1800000000;
$passed = 0;
$failed = 0;

function verifyCase(string $label, callable $makeAuthority, string $company, string $permission, string $credential, string $expectedCode, bool $expectedAllowed = false): void
{
    global $passed, $failed;
    $authority = new class($makeAuthority) implements PortalAuthority {
        public function __construct(private readonly Closure $check) {}
        public function verify(string $serverSessionCredential, string $companyId, string $permission): PortalGrant
        {
            return ($this->check)($serverSessionCredential, $companyId, $permission);
        }
    };

    $decision = (new PortalAccessGate($authority))->authorize($credential, $company, $permission, NOW);
    $matches = $decision->reasonCode === $expectedCode && $decision->allowed === $expectedAllowed;
    if (!$matches) {
        $failed++;
        fwrite(STDERR, "FAIL $label: got {$decision->reasonCode} and allowed=".($decision->allowed ? 'true' : 'false')."\n");
        return;
    }
    $passed++;
    echo "PASS $label\n";
}

$valid = static fn(): PortalGrant => PortalGrant::allow('company-A', 'person-A', PortalAccessGate::VIEW, 1, NOW + 30);
$denial = static fn(): PortalGrant => PortalGrant::deny('not_eligible');
verifyCase('valid read permission', $valid, 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'authorized', true);
verifyCase('wrong capability cannot escalate', $valid, 'company-A', PortalAccessGate::MANAGE, 'opaque-synthetic', 'missing_permission');
verifyCase('different company denied', $valid, 'company-B', PortalAccessGate::VIEW, 'opaque-synthetic', 'wrong_company');
verifyCase('authority denial preserved', $denial, 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'not_eligible');
verifyCase('no session credential denied', $valid, 'company-A', PortalAccessGate::VIEW, '', 'invalid_context');
verifyCase('no tenant denied', $valid, '', PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_context');
verifyCase('unknown permission denied', $valid, 'company-A', 'university:*', 'opaque-synthetic', 'invalid_context');
verifyCase('blank subject denied', static fn() => PortalGrant::allow('company-A', '', PortalAccessGate::VIEW, 1, NOW + 30), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_grant');
verifyCase('zero revision denied', static fn() => PortalGrant::allow('company-A', 'person-A', PortalAccessGate::VIEW, 0, NOW + 30), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_grant');
verifyCase('expired grant denied', static fn() => PortalGrant::allow('company-A', 'person-A', PortalAccessGate::VIEW, 1, NOW), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'expired');
verifyCase('future grant over 60 seconds denied', static fn() => PortalGrant::allow('company-A', 'person-A', PortalAccessGate::VIEW, 1, NOW + 61), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_grant');
verifyCase('grant at 60 seconds accepted', static fn() => PortalGrant::allow('company-A', 'person-A', PortalAccessGate::VIEW, 1, NOW + 60), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'authorized', true);
verifyCase('oversized company denied', static fn() => PortalGrant::allow(str_repeat('c', 81), 'person-A', PortalAccessGate::VIEW, 1, NOW + 30), str_repeat('c', 81), PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_context');
verifyCase('oversized subject denied', static fn() => PortalGrant::allow('company-A', str_repeat('s', 121), PortalAccessGate::VIEW, 1, NOW + 30), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'invalid_grant');
verifyCase('authority exception fails closed', static function (): PortalGrant { throw new RuntimeException('synthetic failure'); }, 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'authority_unavailable');
verifyCase('unavailable Portal fails closed', static fn() => (new UnavailablePortalAuthority())->verify('opaque-synthetic', 'company-A', PortalAccessGate::VIEW), 'company-A', PortalAccessGate::VIEW, 'opaque-synthetic', 'authority_unavailable');

printf("\nPure-PHP access checks: %d passed; %d failed\n", $passed, $failed);
exit($failed > 0 ? 1 : 0);
