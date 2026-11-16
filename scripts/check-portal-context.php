<?php

declare(strict_types=1);

// Standalone smoke tests: real PortalAccessGate and PortalGrant, synthetic authority.
// Does not need Composer, framework, network, keys or database.
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;

$now = 1794750000;
$authority = new class implements PortalAuthority {
    public int $calls = 0;

    public function verify(string $serverSessionCredential, string $companyId, string $permission): PortalGrant
    {
        $this->calls++;
        return PortalGrant::allow(
            'synthetic-company', 'synthetic-user', PortalAccessGate::VIEW, 1, 1794750030
        );
    }
};
$gate = new PortalAccessGate($authority);
$invalid = [
    [' ', 'synthetic-company', PortalAccessGate::VIEW, $now],
    ['synthetic-session', ' ', PortalAccessGate::VIEW, $now],
    [str_repeat('a', 4097), 'synthetic-company', PortalAccessGate::VIEW, $now],
    ["session\ninvalid", 'synthetic-company', PortalAccessGate::VIEW, $now],
    ["session\0invalid", 'synthetic-company', PortalAccessGate::VIEW, $now],
    ['synthetic-session', str_repeat('c', 81), PortalAccessGate::VIEW, $now],
    ['synthetic-session', "company\tinvalid", PortalAccessGate::VIEW, $now],
    ['synthetic-session', 'synthetic-company', 'owner', $now],
    ['synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, 0],
];
foreach ($invalid as $index => [$credential, $company, $permission, $epoch]) {
    $result = $gate->authorize($credential, $company, $permission, $epoch);
    if ($result->allowed || $result->reasonCode !== 'invalid_context') {
        fwrite(STDERR, 'FAIL invalid context #'.($index + 1).PHP_EOL);
        exit(1);
    }
}
if ($authority->calls !== 0) {
    fwrite(STDERR, 'FAIL invalid context touched Portal authority'.PHP_EOL);
    exit(1);
}
$allowed = $gate->authorize('synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, $now);
if (!$allowed->allowed || $authority->calls !== 1) {
    fwrite(STDERR, 'FAIL valid context was incorrectly denied'.PHP_EOL);
    exit(1);
}
echo "PASS 10 Portal context smoke scenarios (9 denied before authority, 1 accepted by synthetic authority).\n";
