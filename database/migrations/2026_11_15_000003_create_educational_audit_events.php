<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * C-08: registro transacional mínimo de mudanças editoriais.
 * Não armazena IP, e-mail, tokens, segredos nem conteúdo de aulas.
 * Retenção/descarta devem ser homologados antes de produção.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('educational_organization_id')
                ->constrained('educational_organizations')
                ->restrictOnDelete();
            $table->string('actor_key', 120);
            $table->string('action', 48);
            $table->string('resource_kind', 24);
            $table->unsignedBigInteger('resource_id');
            $table->unsignedInteger('authority_revision');
            $table->timestampTz('occurred_at');
            $table->index(
                ['educational_organization_id', 'occurred_at'],
                'edu_audit_org_time_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_audit_events');
    }
};
