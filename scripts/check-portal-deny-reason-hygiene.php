<?php

declare(strict_types=1);

/**
 * ERD R130/R131: synthetic reason-code hygiene on the Portal trust boundary.
 * No real session, contract, SSO, grant or network operation.
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
$checks = 0;
$gateFor = static fn (PortalGrant $candidate): PortalAccessGate =>
    new PortalAccessGate(new class($candidate) implements PortalAuthority {
        public function __construct(private PortalGrant $candidate) {}
        public function verify(string $session, string $company, string $permission): PortalGrant
        {
            return $this->candidate;
        }
    });
$verify = static function (PortalGrant $candidate, string $expected) use ($gateFor, $now, &$checks): void {
    $decision = $gateFor($candidate)->authorize(
        'synthetic-server-session', 'synthetic-company', PortalAccessGate::VIEW, $now
    );
    if ($decision->allowed || $decision->reasonCode !== $expected) {
        throw new RuntimeException('Portal denial reason hygiene regression for expected '.$expected);
    }
    if ($decision->subjectId !== '' || $decision->companyId !== '') {
        throw new RuntimeException('Denied decision leaked subject or company');
    }
    ++$checks;
};
foreach ([
    'revoked', 'last_service_cancelled', 'invalid_link_or_permission',
    'editor_revoked', 'context_changed', 'synthetic_context_mismatch',
    'authority_unavailable', 'missing_permission'
] as $reason) {
    $verify(PortalGrant::deny($reason), $reason);
}
foreach ([
    '', 'authorized', 'allow', 'allowed', 'success', 'ok',
    'UpperCase', 'has space', 'subject@example.com', '<script>alert(1)</script>',
    "attack\r\ninjected-log", "bad\nvalue", "bad\tvalue", "nul\0value",
    str_repeat('x', 65), 'accent-é', 'emoji-🔒', '.leading', 'a-b',
    "bad\x7freason", "bad\x80reason"
] as $invalid) {
    $verify(PortalGrant::deny($invalid), 'access_denied');
}
$verify(
    (new UnavailablePortalAuthority())->verify('synthetic-server-session',
        'synthetic-company', PortalAccessGate::VIEW),
    'authority_unavailable'
);
// A local positive fixture only validates the unchanged isolated gate contract.
$positive = $gateFor(PortalGrant::allow('synthetic-company', 'synthetic-subject',
    PortalAccessGate::VIEW, 2, $now + 30))->authorize(
        'synthetic-server-session', 'synthetic-company', PortalAccessGate::VIEW, $now
    );
if (!$positive->allowed || $positive->subjectId !== 'synthetic-subject') {
    throw new RuntimeException('Synthetic positive fixture contract changed');
}
++$checks;
echo 'PASS UNI ERD R130-R131: '.$checks.
    ' synthetic deny-reason/contract scenarios; no real grants.'.PHP_EOL;
