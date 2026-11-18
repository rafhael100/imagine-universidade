<?php

declare(strict_types=1);

namespace App\Domain\Learning;

/** Reject a stale optional order precondition without changing the bool write contract. */
final class EditorialLessonOrderConflict extends \RuntimeException
{
}
