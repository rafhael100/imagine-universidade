<?php

declare(strict_types=1);

namespace App\Domain\Learning;

/** Roll back the whole editorial order and its audit after a live denial. */
final class EditorialOrderWriteRejected extends \RuntimeException
{
}
