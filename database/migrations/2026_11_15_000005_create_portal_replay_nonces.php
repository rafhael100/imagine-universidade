<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One-time use of signed Portal envelopes. A nonce reservation is NOT access,
 * subscription evidence or a verified Portal session.
 *
 * No personal identifiers or unencrypted tokens are persisted: only SHA256
 * of an unguessable 128-bit nonce and bounded expiration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_portal_replay_nonces', function (Blueprint $table): void {
            $table->id();
            $table->char('nonce_sha256', 64)->unique('edu_portal_nonce_sha256_uq');
            $table->unsignedBigInteger('expires_at_epoch');
            $table->timestamp('consumed_at');
            $table->index('expires_at_epoch', 'edu_portal_nonce_expiry_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_portal_replay_nonces');
    }
};
