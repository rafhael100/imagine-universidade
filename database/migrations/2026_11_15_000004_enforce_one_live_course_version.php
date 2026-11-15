<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * C-09: preservar no banco o invariante de no máximo uma versão publicada
 * e uma versão em rascunho por curso. Versões arquivadas são históricas.
 *
 * Compatível com PostgreSQL 18 e SQLite em laboratório; não aplicado nesta PR.
 * Falha se existirem dados legados inconsistentes: NÃO apagar ou corrigir
 * automaticamente o histórico de conteúdo/progresso.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "CREATE UNIQUE INDEX edu_one_published_version_per_course_idx
             ON educational_course_versions (educational_course_id)
             WHERE status = 'published'"
        );

        DB::statement(
            "CREATE UNIQUE INDEX edu_one_draft_version_per_course_idx
             ON educational_course_versions (educational_course_id)
             WHERE status = 'draft'"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS edu_one_draft_version_per_course_idx');
        DB::statement('DROP INDEX IF EXISTS edu_one_published_version_per_course_idx');
    }
};
