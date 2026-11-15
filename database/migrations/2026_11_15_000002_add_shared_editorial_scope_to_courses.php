<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * C-04: um único acervo Imagine, visível somente após grant university:view.
 * O progresso continua vinculado à organização do cliente, jamais ao editorial.
 * SEM seed automático de empresa fictícia e SEM migração aplicada nesta PR.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->boolean('is_shared')->default(false);
            $table->index(
                ['educational_organization_id', 'is_shared', 'is_published'],
                'edu_course_owner_shared_pub_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->dropIndex('edu_course_owner_shared_pub_idx');
            $table->dropColumn('is_shared');
        });
    }
};
