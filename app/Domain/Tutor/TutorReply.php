<?php

declare(strict_types=1);

namespace App\Domain\Tutor;

/** A candidate educational explanation, never an executable instruction. */
final readonly class TutorReply
{
    public function __construct(public string $message)
    {
    }
}
