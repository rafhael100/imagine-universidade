<?php

declare(strict_types=1);

namespace Tests\Browser;

use App\Domain\Access\PortalAuthority;
use App\Domain\Access\PortalGrant;
use Throwable;

/** Only this test boundary is synthetic; all learning/HTTP persistence is real. */
final class LabPortalAuthority implements PortalAuthority
{
    public function verify(string $credential, string $companyId, string $permission): PortalGrant
    {
        try {
            $lab = LabGuard::environment('http');
            LabGuard::http($lab);
            $contents = file_get_contents($lab['control'], false, null, 0, 1025);
            if (!is_string($contents) || strlen($contents) > 1024) {
                return PortalGrant::deny('lab_authority_unavailable');
            }
            $state = json_decode($contents, true, 8, JSON_THROW_ON_ERROR);
            if (!is_array($state) || array_is_list($state)) {
                return PortalGrant::deny('lab_authority_unavailable');
            }
            $keys = array_keys($state);
            sort($keys);
            if ($keys !== ['editor', 'schema_version', 'student-a', 'student-b']
                || $state['schema_version'] !== 1
                || !is_bool($state['editor']) || !is_bool($state['student-a']) || !is_bool($state['student-b'])) {
                return PortalGrant::deny('lab_authority_unavailable');
            }
            foreach (LabGuard::profiles() as $name => $profile) {
                if (hash_equals(LabGuard::credential($name, $lab['token']), $credential)
                    && $profile['company'] === $companyId && $profile['permission'] === $permission) {
                    return $state[$name]
                        ? PortalGrant::allow($companyId, $profile['subject'], $permission, 1, time() + 30)
                        : PortalGrant::deny('lab_profile_revoked');
                }
            }
            return PortalGrant::deny('lab_identity_mismatch');
        } catch (Throwable) {
            return PortalGrant::deny('lab_authority_unavailable');
        }
    }
}
