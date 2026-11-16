<?php

declare(strict_types=1);

namespace App\Domain\Tutor;

/**
 * Approved/published lesson context ONLY. No tenant, session credential,
 * student name, e-mail or chat history is forwarded to the model gateway.
 */
final readonly class TutorQuestion
{
    public function __construct(
        public string $question,
        public string $lessonSlug,
        public int $courseVersion,
        public string $publishedLessonText,
    ) {
    }
}
