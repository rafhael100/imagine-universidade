<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Access\PortalAccessGate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * A sessão só pode ser estabelecida no SERVIDOR após SSO homologado com Portal.
 * Este projeto não inclui login, callback nem provisionador da sessão.
 * Nunca ler empresa/identidade/token de query, form ou header do navegador.
 */
final class RequireUniversityGrant
{
    public function __construct(private readonly PortalAccessGate $gate)
    {
    }

    private function deny(): Response
    {
        return ProtectPrivateUniversityResponses::apply(
            response()->json(['error' => 'access_denied'], 403)
        );
    }

    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $permission = match ($capability) {
            'view' => PortalAccessGate::VIEW,
            'manage' => PortalAccessGate::MANAGE,
            default => null,
        };

        if ($permission === null) {
            return $this->deny();
        }

        try {
            // Exclusivamente sessão originada e custodiada no backend.
            $credential = $request->session()->get('portal_server_credential');
            $company = $request->session()->get('portal_company_id');

            if (!is_string($credential) || !is_string($company)) {
                return $this->deny();
            }

            $grant = $this->gate->authorize($credential, $company, $permission, time());
        } catch (Throwable) {
            return $this->deny();
        }

        if (!$grant->allowed) {
            return $this->deny();
        }

        // Bind the initial server-held session credential to this request
        // without exposing its raw value in a downstream request attribute.
        // This digest is only a drift check, NEVER an authority token.
        $request->attributes->set(
            'university.initial_credential_digest', hash('sha256', $credential)
        );
        $request->attributes->set('university.verified_grant', $grant);
        try {
            $nonce = base64_encode(random_bytes(18));
        } catch (Throwable) {
            return $this->deny();
        }
        $request->attributes->set('university.csp_nonce', $nonce);

        $response = $next($request);

        // A long-running read may finish AFTER the last qualifying service
        // was revoked, a session changed company, or Portal became unavailable.
        // Revalidate GET/HEAD before releasing any page or JSON content.
        // This does not replace authorization/locking for writes: a response
        // check after a committed POST could misleadingly report failure.
        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {
            try {
                // Do not authorize the response for an old tenant/session
                // when the request's server-held session changed during a read.
                // The live Portal recheck below alone only validates the
                // original captured credential and organization.
                if ($request->session()->get('portal_server_credential') !== $credential
                    || $request->session()->get('portal_company_id') !== $company) {
                    return $this->deny();
                }

                $fresh = $this->gate->authorize($credential, $company, $permission, time());
                // The live authority call itself may race with a session
                // transition; verify the binding again before any release.
                if ($request->session()->get('portal_server_credential') !== $credential
                    || $request->session()->get('portal_company_id') !== $company
                    || !$fresh->allowed
                    || $fresh->companyId !== $grant->companyId
                    || $fresh->subjectId !== $grant->subjectId
                    || $fresh->permission !== $grant->permission
                    || $fresh->revision !== $grant->revision) {
                    return $this->deny();
                }
            } catch (Throwable) {
                return $this->deny();
            }
        }

        // The outer response boundary also covers exceptions before this
        // middleware and keeps the nonce only for successful authorized HTML.
        return $response;
    }
}
