<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalGrant;
use App\Domain\Learning\UniversityCatalogRepository;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class SharedCatalogPolicyTest extends TestCase
{
    private const NOW = 1794750000;

    public function test_editorial_company_and_manage_permission_are_required_for_admin(): void
    {
        $method = new ReflectionMethod(UniversityCatalogRepository::class, 'adminOrgId');
        $repository = new UniversityCatalogRepository();

        $wrongCompany = PortalGrant::allow(
            'synthetic-client-A', 'synthetic-editor', PortalAccessGate::MANAGE, 1, self::NOW + 60
        );
        $wrongCapability = PortalGrant::allow(
            'imagine-editorial', 'synthetic-editor', PortalAccessGate::VIEW, 1, self::NOW + 60
        );

        // Estes casos são recusados sem consultar o banco.
        self::assertNull($method->invoke($repository, $wrongCompany));
        self::assertNull($method->invoke($repository, $wrongCapability));
    }

    public function test_editorial_context_is_not_a_student_tenant(): void
    {
        $method = new ReflectionMethod(UniversityCatalogRepository::class, 'orgId');
        $repository = new UniversityCatalogRepository();
        $editorialUser = PortalGrant::allow(
            'imagine-editorial', 'synthetic-editor', PortalAccessGate::VIEW, 1, self::NOW + 60
        );
        self::assertNull($method->invoke($repository, $editorialUser));
    }
}
