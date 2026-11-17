<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Access\PortalGrant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protect the entire private URL boundary, including failures before the
 * route's grant middleware (CSRF, request limits and missing routes).
 * This only controls responses; it never authenticates a session.
 */
final class ProtectPrivateUniversityResponses
{
    public static function matches(Request $request): bool
    {
        return $request->is('universidade/private', 'universidade/private/*');
    }

    public static function apply(Response $response, ?string $nonce = null): Response
    {
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Referrer-Policy', 'same-origin');

        // Only a successful authorized HTML page needs executable resources.
        // The nonce is generated on the server by RequireUniversityGrant.
        $policy = $nonce === null
            ? "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
            : "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; "
                ."form-action 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; "
                ."script-src 'self' 'nonce-".$nonce."'; "
                ."style-src 'self' 'nonce-".$nonce."'";
        $response->headers->set('Content-Security-Policy', $policy);

        return $response;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!self::matches($request)) {
            return $response;
        }

        $grant = $request->attributes->get('university.verified_grant');
        $nonce = $request->attributes->get('university.csp_nonce');
        $authorizedHtml = $response->isSuccessful()
            && str_starts_with(strtolower((string) $response->headers->get('Content-Type')), 'text/html')
            && $grant instanceof PortalGrant && $grant->allowed
            && is_string($nonce) && preg_match('/\A[A-Za-z0-9+\/]{24}\z/D', $nonce) === 1;

        return self::apply($response, $authorizedHtml ? $nonce : null);
    }
}
