<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Optional editorial guidance, never an academic or commercial access rule. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->string('audience', 500)->nullable();
            $table->string('suggested_knowledge', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('educational_courses', function (Blueprint $table): void {
            $table->dropColumn(['audience', 'suggested_knowledge']);
        });
    }
};
