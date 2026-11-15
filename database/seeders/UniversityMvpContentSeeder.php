<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use JsonException;
use RuntimeException;

/**
 * Conteúdo editorial 100% sintético, criado sempre como RASCUNHO.
 * Executar apenas em laboratório autorizado, nunca via deploy automático.
 * A seed NÃO concede identidade/permite acesso de alunos.
 */
final class UniversityMvpContentSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Conteúdo demonstrativo proibido fora de ambiente local/testing.');
        }

        $json = file_get_contents(base_path('content/mvp-cursos-v1.json'));
        if ($json === false) {
            throw new RuntimeException('Catálogo editorial não encontrado.');
        }

        try {
            $manifest = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('Manifesto editorial inválido.');
        }

        if (!is_array($manifest) ||
            ($manifest['schema_version'] ?? null) !== 1 ||
            ($manifest['status'] ?? null) !== 'editorial_draft' ||
            !is_array($manifest['courses'] ?? null)) {
            throw new RuntimeException('Formato editorial não autorizado.');
        }

        DB::transaction(function () use ($manifest): void {
            $organization = DB::table('educational_organizations')
                ->where('synthetic_key', 'imagine-editorial')->value('id');

            if ($organization === null) {
                throw new RuntimeException('Execute primeiro UniversityEditorialDemoSeeder em sandbox.');
            }

            foreach ($manifest['courses'] as $position => $course) {
                if (!is_array($course) ||
                    !is_string($course['slug'] ?? null) ||
                    !preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $course['slug']) ||
                    !is_string($course['title'] ?? null) ||
                    !is_string($course['summary'] ?? null) ||
                    !in_array($course['category'] ?? null, ['metodologia', 'negocios', 'sistemas'], true) ||
                    !is_array($course['lessons'] ?? null) ||
                    $course['lessons'] === []) {
                    throw new RuntimeException('Curso sintético inválido.');
                }

                $existing = DB::table('educational_courses')
                    ->where('educational_organization_id', $organization)
                    ->where('slug', $course['slug'])->exists();

                // Nunca sobrescrever curso, versões, publicação ou progresso existentes.
                if ($existing) {
                    continue;
                }

                $now = now();
                $courseId = DB::table('educational_courses')->insertGetId([
                    'educational_organization_id' => $organization,
                    'slug' => $course['slug'],
                    'title' => $course['title'],
                    'summary' => $course['summary'],
                    'category' => $course['category'],
                    'sort_order' => $position,
                    'is_published' => false,
                    'is_shared' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $versionId = DB::table('educational_course_versions')->insertGetId([
                    'educational_course_id' => $courseId,
                    'version' => 1,
                    'status' => 'draft',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($course['lessons'] as $lessonPosition => $lesson) {
                    if (!is_array($lesson) ||
                        !is_string($lesson['slug'] ?? null) ||
                        !preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/D', $lesson['slug']) ||
                        !is_string($lesson['title'] ?? null) ||
                        !is_string($lesson['body'] ?? null)) {
                        throw new RuntimeException('Aula sintética inválida.');
                    }

                    DB::table('educational_lessons')->insert([
                        'educational_course_version_id' => $versionId,
                        'slug' => $lesson['slug'],
                        'title' => $lesson['title'],
                        'body' => $lesson['body'],
                        'sort_order' => $lessonPosition,
                        'is_published' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        });
    }
}
