<?php

declare(strict_types=1);

namespace App\Domain\Learning;

/** Roll back an INSERT that became possible only after a concurrent lock wait. */
final class ReadingPositionWriteRejected extends \RuntimeException
{
    public function __construct(public readonly string $reasonCode)
    {
        parent::__construct('Private reading position write rejected.');
    }
}
