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

    private function protectedHeaders(Response $response, ?string $nonce = null): Response
    {
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Referrer-Policy', 'same-origin');
        // Denied responses never have executable HTML. Authorized pages
        // may use ONLY a fresh script/style nonce and local resources.
        $policy = $nonce === null
            ? "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
            : "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; "
                ."form-action 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; "
                ."script-src 'self' 'nonce-".$nonce."'; "
                ."style-src 'self' 'nonce-".$nonce."'";
        $response->headers->set('Content-Security-Policy', $policy);

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
        try {
            $nonce = base64_encode(random_bytes(18));
        } catch (Throwable) {
            return $this->deny();
        }
        $request->attributes->set('university.csp_nonce', $nonce);

        return $this->protectedHeaders($next($request), $nonce);
    }
}
