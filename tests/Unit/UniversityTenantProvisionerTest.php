<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityTenantProvisioner;
use PHPUnit\Framework\TestCase;

/**
 * Unit checks deny-before-DB. Positive provisioner behavior is covered in
 * SharedCurriculumFlowTest with a disposable synthetic database.
 */
final class UniversityTenantProvisionerTest extends TestCase
{
    public function test_expired_and_overlong_grants_never_initialize_tenant(): void
    {
        $provisioner = new UniversityTenantProvisioner();
        $now = time();

        foreach ([
            PortalGrant::allow('synthetic-company', 'person', PortalAccessGate::VIEW, 1, $now - 1),
            PortalGrant::allow('synthetic-company', 'person', PortalAccessGate::VIEW, 1, $now),
            PortalGrant::allow('synthetic-company', 'person', PortalAccessGate::VIEW, 1, $now + 61),
            PortalGrant::allow('synthetic-company', 'person', PortalAccessGate::VIEW, 0, $now + 30),
        ] as $invalidGrant) {
            self::assertFalse($provisioner->initialize($invalidGrant, $now));
        }
    }

    public function test_editorial_role_wrong_permission_and_invalid_ids_are_denied(): void
    {
        $provisioner = new UniversityTenantProvisioner();
        $now = time();
        foreach ([
            PortalGrant::allow('imagine-editorial', 'editor', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('client-company', 'editor', PortalAccessGate::MANAGE, 1, $now + 30),
            PortalGrant::allow('   ', 'person', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('company', '  ', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow(str_repeat('x', 81), 'person', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('company with spaces', 'person', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('.leading-dot', 'person', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('company', 'person with spaces', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('company', '.leading-subject', PortalAccessGate::VIEW, 1, $now + 30),
            PortalGrant::allow('company', "subject\nwith-newline", PortalAccessGate::VIEW, 1, $now + 30),
        ] as $invalidGrant) {
            self::assertFalse($provisioner->initialize($invalidGrant, $now));
        }
    }
}
