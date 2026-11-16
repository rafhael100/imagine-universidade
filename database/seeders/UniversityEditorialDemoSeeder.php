<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Semente sintética APENAS em sandbox local ou testing.
 * Nunca vincula um operador real nem concede acesso por si só.
 */
final class UniversityEditorialDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            throw new RuntimeException('A seed sintética é proibida fora de ambiente local/testing.');
        }

        $now = now();

        DB::table('educational_organizations')->insertOrIgnore([
            'synthetic_key' => 'imagine-editorial',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
