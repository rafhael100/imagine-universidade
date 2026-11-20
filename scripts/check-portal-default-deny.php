<?php

declare(strict_types=1);

/**
 * UNI ERD-R88/R89: dependency-free, read-only default-deny regression.
 * This test does not simulate an authorized customer or activate SSO.
 */
require_once __DIR__.'/../app/Domain/Access/PortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalGrant.php';
require_once __DIR__.'/../app/Domain/Access/UnavailablePortalAuthority.php';
require_once __DIR__.'/../app/Domain/Access/PortalAccessGate.php';

use App\Domain\Access\PortalAccessGate;
use App\Domain\Access\UnavailablePortalAuthority;

function normalizedProviderCode(string $source): string
{
    $code = '';
    foreach (token_get_all($source, TOKEN_PARSE) as $token) {
        if (!is_array($token)) {
            $code .= $token;
            continue;
        }
        [$type, $value] = $token;
        if (in_array($type, [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
            continue;
        }
        // A quoted string must not masquerade as an actual DI registration.
        if ($type === T_CONSTANT_ENCAPSED_STRING) {
            $code .= '""';
            continue;
        }
        $code .= $value;
    }

    return $code;
}

function checkUnavailablePortalBinding(string $source): void
{
    $code = normalizedProviderCode($source);
    $methods = ['bind', 'singleton', 'scoped', 'instance'];
    $count = 0;
    foreach ($methods as $method) {
        $needle = '$this->app->'.$method.'(PortalAuthority::class,';
        $count += substr_count($code, $needle);
    }
    if ($count !== 1) {
        throw new RuntimeException('Expected exactly one PortalAuthority DI registration');
    }
    if (substr_count(
        $code,
        '$this->app->bind(PortalAuthority::class,UnavailablePortalAuthority::class);'
    ) !== 1) {
        throw new RuntimeException('PortalAuthority production default must be deny-all');
    }
    if (substr_count(
        $code,
        'newPortalAccessGate($app->make(PortalAuthority::class))'
    ) !== 1) {
        throw new RuntimeException('PortalAccessGate must resolve registered authority');
    }
    if (substr_count(
        $code,
        '$this->app->bind(TutorGateway::class,DisabledTutorGateway::class);'
    ) !== 1) {
        throw new RuntimeException('Tutor must remain disabled by default');
    }
}

$provider = file_get_contents(__DIR__.'/../app/Providers/AppServiceProvider.php');
if (!is_string($provider)) {
    throw new RuntimeException('Missing production service provider');
}
checkUnavailablePortalBinding($provider);

$binding = '$this->app->bind(PortalAuthority::class, UnavailablePortalAuthority::class);';
if (substr_count($provider, $binding) !== 1) {
    throw new RuntimeException('Unexpected source format for test fixture');
}
$rejected = 0;
$deny = static function (string $label, string $source) use (&$rejected): void {
    try {
        checkUnavailablePortalBinding($source);
    } catch (RuntimeException) {
        ++$rejected;
        return;
    }
    throw new RuntimeException('Unsafe binding fixture was accepted: '.$label);
};
$deny('commented production registration', str_replace($binding, '// '.$binding, $provider));
$deny('alternate candidate registration', str_replace(
    $binding, '$this->app->bind(PortalAuthority::class, CandidatePortalAuthority::class);', $provider
));
$deny('duplicate registration', str_replace($binding, $binding."\n".$binding, $provider));
$deny('overriding singleton', str_replace(
    $binding, $binding."\n".'$this->app->singleton(PortalAuthority::class, CandidatePortalAuthority::class);',
    $provider
));
$deny('binding stored only as a quoted string', str_replace(
    $binding, '$unused = "'.$binding.'";', $provider
));
$deny('tutor secretly enabled', str_replace(
    'DisabledTutorGateway::class', 'EnabledTutorGateway::class', $provider
));

$gate = new PortalAccessGate(new UnavailablePortalAuthority());
$now = 1794750000;
$scenarios = 0;
foreach ([PortalAccessGate::VIEW, PortalAccessGate::MANAGE] as $permission) {
    foreach ([
        ['synthetic-server-session', 'synthetic-company', 'authority_unavailable'],
        ['fake-browser-cookie', 'synthetic-company', 'authority_unavailable'],
        ['synthetic-server-session', 'other-company', 'authority_unavailable'],
        [' ', 'synthetic-company', 'invalid_context'],
        ['synthetic-server-session', 'tenant@invalid', 'invalid_context'],
    ] as [$credential, $company, $expected]) {
        $grant = $gate->authorize($credential, $company, $permission, $now);
        if ($grant->allowed || $grant->reasonCode !== $expected) {
            throw new RuntimeException('Default Portal authority accepted an invalid access scenario');
        }
        ++$scenarios;
    }
}
echo 'PASS R88/R89: '.$scenarios.' default-deny view/manage checks and '.
    $rejected.' negative DI binding fixtures; no SSO or grant issued.'.PHP_EOL;
