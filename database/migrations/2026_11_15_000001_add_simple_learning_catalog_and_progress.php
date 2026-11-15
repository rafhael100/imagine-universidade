<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * C-01: apenas esquema candidato. Nenhuma migração executada, nenhum acesso HTTP.
 * A FK de organização é integridade referencial, NÃO autorização de tenant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->string('category', 32)->default('metodologia');
            $table->string('summary', 500)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::create('educational_lessons', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('educational_course_version_id')
                ->constrained('educational_course_versions')
                ->cascadeOnDelete();
            $table->string('slug', 120);
            $table->string('title', 200);
            $table->text('body');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique(['educational_course_version_id', 'slug'], 'edu_lesson_version_slug_uq');
            $table->index(['educational_course_version_id', 'sort_order'], 'edu_lesson_version_sort_idx');
        });

        Schema::create('educational_lesson_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('educational_organization_id')
                ->constrained('educational_organizations')
                ->cascadeOnDelete();
            $table->foreignId('educational_lesson_id')
                ->constrained('educational_lessons')
                ->cascadeOnDelete();
            $table->string('subject_key', 120);
            $table->timestampTz('completed_at');
            $table->timestamps();
            $table->unique(
                ['educational_organization_id', 'subject_key', 'educational_lesson_id'],
                'edu_progress_org_subject_lesson_uq'
            );
            $table->index(['educational_organization_id', 'subject_key'], 'edu_progress_org_subject_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_lesson_progress');
        Schema::dropIfExists('educational_lessons');
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->dropColumn(['category', 'summary', 'sort_order']);
        });
    }
};
