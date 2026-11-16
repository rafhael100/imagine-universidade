<?php

declare(strict_types=1);

// Pure domain smoke: every sample is invalid and must stop BEFORE database access.
// If Laravel, database or Composer is needed, this script intentionally fails.
require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';
require_once __DIR__.'/../app/Domain/Learning/UniversityTenantProvisioner.php';

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityTenantProvisioner;

$now = time();
$invalid = [
    PortalGrant::deny('authority_unavailable'),
    PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('tenant-a', 'person', PortalAccessGate::MANAGE, 1, $now + 30),
    PortalGrant::allow('tenant-a', 'person', PortalAccessGate::VIEW, 0, $now + 30),
    PortalGrant::allow('tenant-a', 'person', PortalAccessGate::VIEW, 1, $now - 1),
    PortalGrant::allow('tenant-a', 'person', PortalAccessGate::VIEW, 1, $now + 61),
    PortalGrant::allow('company with spaces', 'person', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('.leading-company', 'person', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow(str_repeat('c', 81), 'person', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('tenant-a', 'bad subject', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('tenant-a', '.leading-subject', PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('tenant-a', "subject\nline", PortalAccessGate::VIEW, 1, $now + 30),
    PortalGrant::allow('tenant-a', str_repeat('s', 121), PortalAccessGate::VIEW, 1, $now + 30),
];
$provisioner = new UniversityTenantProvisioner();
foreach ($invalid as $i => $grant) {
    if ($provisioner->initialize($grant, $now)) {
        fwrite(STDERR, 'FAIL: invalid provisioning grant '.($i + 1).PHP_EOL);
        exit(1);
    }
}
echo 'PASS '.count($invalid).' tenant-provisioning negatives without database or Composer.'.PHP_EOL;
