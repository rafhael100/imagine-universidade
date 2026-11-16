<?php

declare(strict_types=1);

namespace App\Domain\Tutor;

/**
 * Read-only educational explanation contract. No tools, writes or model
 * credentials in this interface. Source context is server-selected.
 */
interface TutorGateway
{
    public function explain(TutorQuestion $question): TutorReply;
}
