<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Private student preferences, never an editorial/manager directory.
 * Retention starts after official loss of the last eligibility, not created_at.
 * No deletion schedule can infer that event while the Portal source is absent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_course_favorites', function (Blueprint $table): void {
            $table->foreignId('educational_organization_id')
                ->constrained('educational_organizations')
                ->restrictOnDelete();
            $table->string('subject_key', 120);
            $table->foreignId('educational_course_id')
                ->constrained('educational_courses')
                ->restrictOnDelete();
            $table->timestamps();
            $table->unique(
                ['educational_organization_id', 'subject_key', 'educational_course_id'],
                'edu_favorites_org_subject_course_uq'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_course_favorites');
    }
};
