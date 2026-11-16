<?php

declare(strict_types=1);

/**
 * Verify that invalid tenant grants fail BEFORE Laravel, HTTP or any database
 * call. Only synthetic identities are used.
 * Run: php scripts/check-tenant-guard.php
 */
use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityTenantProvisioner;

require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';
require_once __DIR__.'/../app/Domain/Learning/UniversityTenantProvisioner.php';

$now = time();
$provisioner = new UniversityTenantProvisioner();
$cases = [
    'expired' => PortalGrant::allow('synthetic-client', 'person', PortalAccessGate::VIEW, 1, $now - 1),
    'expired boundary' => PortalGrant::allow('synthetic-client', 'person', PortalAccessGate::VIEW, 1, $now),
    'TTL over limit' => PortalGrant::allow('synthetic-client', 'person', PortalAccessGate::VIEW, 1, $now + 61),
    'zero revision' => PortalGrant::allow('synthetic-client', 'person', PortalAccessGate::VIEW, 0, $now + 30),
    'editorial company cannot enter as student' => PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, $now + 30),
    'manage cannot substitute view' => PortalGrant::allow('synthetic-client', 'person', PortalAccessGate::MANAGE, 1, $now + 30),
    'empty company' => PortalGrant::allow('   ', 'person', PortalAccessGate::VIEW, 1, $now + 30),
    'empty subject' => PortalGrant::allow('synthetic-client', '  ', PortalAccessGate::VIEW, 1, $now + 30),
    'company exceeds schema limit' => PortalGrant::allow(str_repeat('x', 81), 'person', PortalAccessGate::VIEW, 1, $now + 30),
];

$successes = 0;
foreach ($cases as $name => $grant) {
    // A facade DB is deliberately not loaded in this script; any database
    // call here would reveal a fail-open policy or an unexpected exception.
    if ($provisioner->initialize($grant, $now) !== false) {
        fwrite(STDERR, "FAIL: {$name}\n");
        exit(1);
    }
    ++$successes;
    echo "PASS: {$name}\n";
}

echo "\n{$successes}/{$successes} synthetic tenant denial checks passed.\n";
