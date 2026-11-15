<?php

declare(strict_types=1);

/**
 * Pure-PHP synthetic learning-policy smoke tests: no Composer, DB or Portal.
 * This legacy mock uses per-company lesson IDs and is NOT the live shared catalog.
 * Run: php scripts/check-learning-mock.php
 */

use App\Domain\Access\AccessSnapshot;
use App\Domain\Access\MockEntitlementPolicy;
use App\Domain\Learning\MockLessonProgress;

require_once __DIR__.'/../app/Domain/Access/AccessSnapshot.php';
require_once __DIR__.'/../app/Domain/Access/AccessDecision.php';
require_once __DIR__.'/../app/Domain/Access/MockEntitlementPolicy.php';
require_once __DIR__.'/../app/Domain/Learning/MockLessonProgress.php';

function context(array $overrides = []): AccessSnapshot
{
    return new AccessSnapshot(...array_replace([
        'requestedCompanyId' => 'demo-company-A',
        'authorizedCompanyId' => 'demo-company-A',
        'subjectId' => 'demo-user-A',
        'entitlementRevision' => 1,
        'authorityVerified' => true,
        'identityVerified' => true,
        'companyLinkActive' => true,
        'resourcePermissionGranted' => true,
        'hasEligibleActiveService' => true,
        'trialOnly' => false,
        'revoked' => false,
    ], $overrides));
}

$progress = new MockLessonProgress(new MockEntitlementPolicy());
$passed = 0;
$failed = 0;
function expectCase(string $label, bool $ok): void
{
    global $passed, $failed;
    if ($ok) { ++$passed; echo "PASS $label\n"; }
    else { ++$failed; fwrite(STDERR, "FAIL $label\n"); }
}

$one = $progress->complete(context(), 'demo-company-A', 'lesson-01', true, true);
expectCase('first completion', $one['ok'] && $one['already_completed'] === false);
$two = $progress->complete(context(), 'demo-company-A', 'lesson-01', true, true);
expectCase('idempotent completion', $two['ok'] && $two['already_completed'] === true);
expectCase('completed state available to owner', $progress->status(context(), 'demo-company-A', 'lesson-01', true, true)['completed'] === true);
expectCase('different student has independent progress', $progress->status(context(['subjectId'=>'demo-user-B']), 'demo-company-A', 'lesson-01', true, true)['completed'] === false);
expectCase('different lesson has independent progress', $progress->status(context(), 'demo-company-A', 'lesson-02', true, true)['completed'] === false);
expectCase('other company rejected', $progress->status(context(), 'demo-company-B', 'lesson-01', true, true)['code'] === 'wrong_company');
expectCase('draft lesson cannot be completed', $progress->complete(context(), 'demo-company-A', 'lesson-02', true, false)['code'] === 'not_published');
expectCase('draft course cannot be completed', $progress->complete(context(), 'demo-company-A', 'lesson-02', false, true)['code'] === 'not_published');
expectCase('revocation denies reading previous progress', $progress->status(context(['revoked'=>true]), 'demo-company-A', 'lesson-01', true, true)['code'] === 'revoked');
expectCase('authority outage denies read', $progress->status(context(['authorityVerified'=>false]), 'demo-company-A', 'lesson-01', true, true)['code'] === 'authority_unavailable');
expectCase('no eligible service denies read', $progress->status(context(['hasEligibleActiveService'=>false]), 'demo-company-A', 'lesson-01', true, true)['code'] === 'not_eligible');
expectCase('trial only denies read', $progress->status(context(['trialOnly'=>true]), 'demo-company-A', 'lesson-01', true, true)['code'] === 'not_eligible');
expectCase('missing permission denies write', $progress->complete(context(['resourcePermissionGranted'=>false]), 'demo-company-A', 'lesson-02', true, true)['code'] === 'missing_permission');
expectCase('inactive company link denies write', $progress->complete(context(['companyLinkActive'=>false]), 'demo-company-A', 'lesson-02', true, true)['code'] === 'link_not_active');
expectCase('malformed lesson identifier rejected', $progress->complete(context(), 'demo-company-A', '../bad/path', true, true)['code'] === 'invalid_lesson');

printf("\nPure-PHP mock learning checks: %d passed; %d failed\n", $passed, $failed);
exit($failed === 0 ? 0 : 1);
