<?php

declare(strict_types=1);

namespace App\Domain\Access;

/**
 * Uma decisão negativa ou inconclusiva NUNCA concede um recurso.
 */
final readonly class AccessDecision
{
    public function __construct(
        public bool $allowed,
        public string $reasonCode,
        public int $revision,
    ) {
    }

    public static function deny(string $reasonCode, int $revision): self
    {
        return new self(false, $reasonCode, $revision);
    }

    public static function allow(int $revision): self
    {
        return new self(true, 'eligible', $revision);
    }
}
