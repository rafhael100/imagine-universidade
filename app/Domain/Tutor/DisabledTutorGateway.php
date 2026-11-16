<?php

declare(strict_types=1);

namespace App\Domain\Tutor;

use RuntimeException;

/**
 * Production-safe default until the central Imagine AI model manager,
 * published corpus policy, budgets, privacy and AppSec are homologated.
 */
final readonly class DisabledTutorGateway implements TutorGateway
{
    public function explain(TutorQuestion $question): TutorReply
    {
        throw new RuntimeException('tutor_not_configured');
    }
}
