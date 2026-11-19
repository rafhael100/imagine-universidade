<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One explicit reading preference per company/person, with a random revision.
 * Clearing retains an empty slot to fence old writes; it erases the reference
 * and saved_at. Future authorized retention also covers empty slots. No purge
 * can infer loss of eligibility from saved_at or from a withdrawn course.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_reading_positions', function (Blueprint $table): void {
            $table->foreignId('educational_organization_id')
                ->constrained('educational_organizations')->restrictOnDelete();
            $table->string('subject_key', 120);
            // The immutable lesson relationship pins the exact course/version.
            $table->foreignId('educational_lesson_id')->nullable()
                ->constrained('educational_lessons')->restrictOnDelete();
            $table->string('revision', 67);
            $table->timestampTz('saved_at')->nullable();
            $table->unique(
                ['educational_organization_id', 'subject_key'],
                'edu_reading_position_org_subject_uq',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_reading_positions');
    }
};
