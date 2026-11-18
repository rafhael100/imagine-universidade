<?php

declare(strict_types=1);

namespace App\Domain\Learning;

/** Reject a stale optional course order guard without changing the bool write contract. */
final class EditorialCourseOrderConflict extends \RuntimeException
{
}
