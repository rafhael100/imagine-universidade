<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_organizations', function (Blueprint $table): void {
            $table->id();
            $table->string('synthetic_key', 80)->unique();
            $table->timestamps();
        });

        Schema::create('educational_courses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('educational_organization_id')
                ->constrained('educational_organizations')
                ->restrictOnDelete();
            $table->string('slug', 120);
            $table->string('title', 200);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique(['educational_organization_id', 'slug']);
        });

        Schema::create('educational_course_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('educational_course_id')
                ->constrained('educational_courses')
                ->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('status', 32)->default('draft');
            $table->timestamps();
            $table->unique(['educational_course_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_course_versions');
        Schema::dropIfExists('educational_courses');
        Schema::dropIfExists('educational_organizations');
    }
};
