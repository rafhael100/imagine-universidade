<?php

declare(strict_types=1);

use App\Domain\Learning\UniversityEditorialFixtureImporter;
use Illuminate\Support\Facades\Artisan;

/**
 * Fixture preparation is a lab-only operation, never an HTTP endpoint.
 * The importer itself rejects all non-testing environments.
 */
Artisan::command('university:load-synthetic-editorial {--confirm-synthetic}', function (): int {
    if (!$this->option('confirm-synthetic')) {
        $this->error('Explicit --confirm-synthetic is required.');
        return 2;
    }

    try {
        $result = app(UniversityEditorialFixtureImporter::class)->import();
    } catch (Throwable) {
        // Do not expose DB paths, credentials or data in CLI logs.
        $this->error('Synthetic editorial import was not permitted or failed.');
        return 1;
    }

    $this->info(sprintf(
        'Synthetic editorial draft: %d courses created; %d lessons created; %d courses preserved.',
        $result['courses_created'],
        $result['lessons_created'],
        $result['courses_skipped'],
    ));

    return 0;
})->purpose('QA only: load approved synthetic draft courses, never publish or overwrite.');
