<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use App\Domain\Access\UnavailablePortalAuthority;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class PortalAccessGateTest extends TestCase
{
    private const NOW = 1794750000;

    private function gate(PortalGrant $grant): PortalAccessGate
    {
        return new PortalAccessGate(new class($grant) implements PortalAuthority {
            public function __construct(private readonly PortalGrant $grant) {}
            public function verify(string $serverSessionCredential, string $companyId, string $permission): PortalGrant
            {
                return $this->grant;
            }
        });
    }

    public function test_default_unavailable_authority_never_grants(): void
    {
        $result = (new PortalAccessGate(new UnavailablePortalAuthority()))
            ->authorize('synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW);
        self::assertFalse($result->allowed);
        self::assertSame('authority_unavailable', $result->reasonCode);
    }

    public function test_explicit_valid_verified_grant_is_accepted_only_for_exact_permission(): void
    {
        $grant = PortalGrant::allow('synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 60);
        $gate = $this->gate($grant);
        self::assertTrue($gate->authorize('synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW)->allowed);
        self::assertSame('missing_permission', $gate->authorize(
            'synthetic-session', 'synthetic-company', PortalAccessGate::MANAGE, self::NOW
        )->reasonCode);
    }

    public function test_wrong_company_is_denied(): void
    {
        $grant = PortalGrant::allow('synthetic-company-B', 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 60);
        self::assertSame('wrong_company', $this->gate($grant)->authorize(
            'synthetic-session', 'synthetic-company-A', PortalAccessGate::VIEW, self::NOW
        )->reasonCode);
    }

    public function test_expiry_at_boundary_and_missing_revision_are_denied(): void
    {
        foreach ([self::NOW - 1, self::NOW] as $expiresAt) {
            $grant = PortalGrant::allow('synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1, $expiresAt);
            self::assertSame('expired', $this->gate($grant)->authorize(
                'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
            )->reasonCode);
        }
        $grant = PortalGrant::allow('synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 0, self::NOW + 60);
        self::assertSame('invalid_grant', $this->gate($grant)->authorize(
            'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
        )->reasonCode);
    }

    public function test_empty_session_and_unknown_permission_never_touch_authority(): void
    {
        $gate = $this->gate(PortalGrant::allow('synthetic-company', 'synthetic-person', PortalAccessGate::MANAGE, 1, self::NOW + 60));
        self::assertSame('invalid_context', $gate->authorize(
            '', 'synthetic-company', PortalAccessGate::MANAGE, self::NOW
        )->reasonCode);
        self::assertSame('invalid_context', $gate->authorize(
            'synthetic-session', 'synthetic-company', 'owner', self::NOW
        )->reasonCode);
    }

    public function test_authority_exception_fails_closed(): void
    {
        $authority = new class implements PortalAuthority {
            public function verify(string $serverSessionCredential, string $companyId, string $permission): PortalGrant
            {
                throw new RuntimeException('unavailable');
            }
        };
        $result = (new PortalAccessGate($authority))->authorize(
            'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
        );
        self::assertFalse($result->allowed);
        self::assertSame('authority_unavailable', $result->reasonCode);
    }
    public function test_oversized_grants_and_excessive_ttl_are_denied(): void
    {
        foreach ([
            PortalGrant::allow('synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 61),
            PortalGrant::allow('synthetic-company', str_repeat('b', 121), PortalAccessGate::VIEW, 1, self::NOW + 60),
        ] as $grant) {
            self::assertSame('invalid_grant', $this->gate($grant)->authorize(
                'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
            )->reasonCode);
        }

        self::assertSame('invalid_context', $this->gate(
            PortalGrant::allow(str_repeat('a', 81), 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 60)
        )->authorize(
            'synthetic-session', str_repeat('a', 81), PortalAccessGate::VIEW, self::NOW
        )->reasonCode);
    }

    public function test_noncanonical_tenant_or_subject_ids_fail_closed(): void
    {
        $valid = PortalGrant::allow(
            'synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 30
        );
        foreach (['invalid company', 'tenant@invalid', '.leading-dot', "tenant\nbreak"] as $company) {
            self::assertSame('invalid_context', $this->gate($valid)->authorize(
                'synthetic-session', $company, PortalAccessGate::VIEW, self::NOW
            )->reasonCode, $company);
        }

        foreach (['bad subject', '.leading-dot', "subject\nbreak", 'sübject'] as $subject) {
            $grant = PortalGrant::allow(
                'synthetic-company', $subject, PortalAccessGate::VIEW, 1, self::NOW + 30
            );
            self::assertSame('invalid_grant', $this->gate($grant)->authorize(
                'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
            )->reasonCode, $subject);
        }
    }

    public function test_slow_portal_reply_cannot_grant_access_even_with_future_expiry(): void
    {
        $authority = new class implements PortalAuthority {
            public int $calls = 0;
            public function verify(
                string $serverSessionCredential,
                string $companyId,
                string $permission,
            ): PortalGrant {
                $this->calls++;
                usleep(20_000);
                return PortalGrant::allow(
                    'synthetic-company', 'synthetic-person',
                    PortalAccessGate::VIEW, 1, 1794750030
                );
            }
        };
        $gate = new PortalAccessGate($authority, 2);
        $result = $gate->authorize(
            'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
        );
        self::assertFalse($result->allowed);
        self::assertSame('authority_timeout', $result->reasonCode);
        self::assertSame(1, $authority->calls);
    }

    public function test_grant_expiring_during_verification_is_not_accepted(): void
    {
        $gate = $this->gate(PortalGrant::allow(
            'synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1,
            self::NOW + 1,
        ));
        $result = $gate->authorize(
            'synthetic-session', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
        );
        self::assertFalse($result->allowed);
        self::assertSame('expired', $result->reasonCode);
    }

    public function test_printable_ascii_opaque_session_token_is_still_accepted_in_synthetic_unit_test(): void
    {
        $grant = PortalGrant::allow(
            'synthetic-company', 'synthetic-person', PortalAccessGate::VIEW, 1, self::NOW + 30
        );
        self::assertTrue($this->gate($grant)->authorize(
            'token-ABC_123.+/=:~', 'synthetic-company', PortalAccessGate::VIEW, self::NOW
        )->allowed);
    }

    public function test_authority_budget_outside_safe_range_is_rejected(): void
    {
        foreach ([0, -1, 5001] as $budget) {
            try {
                new PortalAccessGate(new UnavailablePortalAuthority(), $budget);
                self::fail('Invalid Portal read budget was accepted.');
            } catch (\InvalidArgumentException) {
                self::assertTrue(true);
            }
        }
    }

    public function test_invalid_context_is_rejected_before_consulting_portal_authority(): void
    {
        $authority = new class implements PortalAuthority {
            public int $calls = 0;

            public function verify(
                string $serverSessionCredential,
                string $companyId,
                string $permission,
            ): PortalGrant {
                $this->calls++;
                return PortalGrant::allow(
                    'synthetic-company', 'synthetic-person',
                    PortalAccessGate::VIEW, 1, 1794750030
                );
            }
        };
        $gate = new PortalAccessGate($authority);
        $inputs = [
            [str_repeat('x', 4097), 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\ncredential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\x00credential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic credential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\x85credential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\x9bcredential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\u{200B}credential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\u{202E}credential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ["synthetic\xFFcredential", 'synthetic-company', PortalAccessGate::VIEW, self::NOW],
            ['synthetic-credential', str_repeat('c', 81), PortalAccessGate::VIEW, self::NOW],
            ['synthetic-credential', "synthetic\rcompany", PortalAccessGate::VIEW, self::NOW],
            ['synthetic-credential', 'synthetic-company', PortalAccessGate::VIEW, 0],
            ['synthetic-credential', 'synthetic-company', 'owner', self::NOW],
        ];

        foreach ($inputs as [$credential, $company, $permission, $now]) {
            $decision = $gate->authorize($credential, $company, $permission, $now);
            self::assertFalse($decision->allowed);
            self::assertSame('invalid_context', $decision->reasonCode);
        }

        self::assertSame(0, $authority->calls);
    }

}
