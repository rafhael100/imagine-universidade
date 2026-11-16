<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use App\Domain\Access\AccessSnapshot;
use App\Domain\Access\MockEntitlementPolicy;

/**
 * SOMENTE C-01: armazenamento sintético na memória, sem banco ou endpoints HTTP.
 * O Portal é a única autoridade real de identidade, empresa, vínculo e contrato.
 * Não utilizar valores de AccessSnapshot recebidos diretamente do navegador.
 */
final class MockLessonProgress
{
    /** @var array<string,array<string,array<string,true>>> */
    private array $completed = [];

    public function __construct(private readonly MockEntitlementPolicy $entitlements)
    {
    }

    /** @return array{ok:bool,code:string,already_completed?:bool} */
    public function complete(
        AccessSnapshot $snapshot,
        string $lessonCompanyId,
        string $lessonId,
        bool $coursePublished,
        bool $lessonPublished,
    ): array {
        $rejection = $this->rejectReason(
            $snapshot, $lessonCompanyId, $lessonId, $coursePublished, $lessonPublished
        );
        if ($rejection !== null) {
            return ['ok' => false, 'code' => $rejection];
        }

        $existing = isset($this->completed[$lessonCompanyId][$snapshot->subjectId][$lessonId]);
        $this->completed[$lessonCompanyId][$snapshot->subjectId][$lessonId] = true;

        return ['ok' => true, 'code' => 'completed', 'already_completed' => $existing];
    }

    /** @return array{ok:bool,code:string,completed?:bool} */
    public function status(
        AccessSnapshot $snapshot,
        string $lessonCompanyId,
        string $lessonId,
        bool $coursePublished,
        bool $lessonPublished,
    ): array {
        $rejection = $this->rejectReason(
            $snapshot, $lessonCompanyId, $lessonId, $coursePublished, $lessonPublished
        );
        if ($rejection !== null) {
            return ['ok' => false, 'code' => $rejection];
        }

        return [
            'ok' => true,
            'code' => 'eligible',
            'completed' => isset($this->completed[$lessonCompanyId][$snapshot->subjectId][$lessonId]),
        ];
    }

    private function rejectReason(
        AccessSnapshot $snapshot,
        string $lessonCompanyId,
        string $lessonId,
        bool $coursePublished,
        bool $lessonPublished,
    ): ?string {
        $decision = $this->entitlements->evaluate($snapshot);
        if (!$decision->allowed) {
            return $decision->reasonCode;
        }

        if (trim($lessonCompanyId) === '' || $lessonCompanyId !== $snapshot->requestedCompanyId) {
            return 'wrong_company';
        }

        if (!preg_match('/\A[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}\z/D', $lessonId)) {
            return 'invalid_lesson';
        }

        if (!$coursePublished || !$lessonPublished) {
            return 'not_published';
        }

        return null;
    }
}
