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

    private function protectedHeaders(Response $response): Response
    {
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Referrer-Policy', 'same-origin');

        return $response;
    }

    private function deny(): Response
    {
        return $this->protectedHeaders(
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

        $request->attributes->set('university.verified_grant', $grant);

        return $this->protectedHeaders($next($request));
    }
}
