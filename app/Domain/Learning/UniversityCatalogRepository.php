<?php

declare(strict_types=1);

namespace App\Domain\Learning;

use App\Domain\Access\PortalGrant;
use App\Domain\Access\PortalAccessGate;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * C-03: consultas sempre limitadas à organização do grant VERIFICADO no servidor.
 * Não usar antes do adaptador Portal homologado e das migrações aprovadas.
 */
final class UniversityCatalogRepository
{
    private const EDITORIAL_ORGANIZATION_KEY = 'imagine-editorial';

    private function resolveOrganizationId(string $key): ?int
    {
        if (trim($key) === '' || strlen($key) > 80) {
            return null;
        }
        $id = DB::table('educational_organizations')->where('synthetic_key', $key)->value('id');
        return $id === null ? null : (int) $id;
    }

    /**
     * Defense in depth. A grant object is NOT proof of an authenticated
     * Portal session: the HTTP middleware must verify it first.
     * Never reuse grants that expired during the current operation.
     */
    private function grantUsable(PortalGrant $grant, string $permission): bool
    {
        $now = time();

        return $grant->allowed
            && $grant->permission === $permission
            && $grant->revision >= 1
            && $grant->expiresAtEpoch > $now
            && $grant->expiresAtEpoch <= $now + 60
            && trim($grant->companyId) !== ''
            && trim($grant->subjectId) !== ''
            && strlen($grant->companyId) <= 80
            && strlen($grant->subjectId) <= 120;
    }

    // O tenant do cliente contém APENAS seu progresso.
    private function orgId(PortalGrant $grant): ?int
    {
        if (!$this->grantUsable($grant, PortalAccessGate::VIEW) ||
            $grant->companyId === self::EDITORIAL_ORGANIZATION_KEY) {
            return null;
        }
        return $this->resolveOrganizationId($grant->companyId);
    }

    // Material editorial centralizado da Imagine; jamais edição por clientes.
    private function contentOrgId(): ?int
    {
        return $this->resolveOrganizationId(self::EDITORIAL_ORGANIZATION_KEY);
    }

    private function adminOrgId(PortalGrant $grant): ?int
    {
        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE) ||
            $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY) {
            return null;
        }
        return $this->contentOrgId();
    }

    /**
     * Catálogo publicado da Imagine, com progresso calculado somente pela
     * empresa/sujeito do grant verificado. Sem consultar outros tenants.
     *
     * @return array<int, stdClass>
     */
    public function catalog(PortalGrant $grant): array
    {
        $org = $this->orgId($grant);
        if ($org === null) {
            return [];
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return [];
        }

        $courses = DB::table('educational_courses as c')
            ->join('educational_course_versions as v', 'v.educational_course_id', '=', 'c.id')
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->orderBy('c.sort_order')
            ->orderBy('c.id')
            ->select('c.id', 'c.slug', 'c.title', 'c.summary', 'c.category', 'v.id as version_id')
            ->get()->all();

        if ($courses === []) {
            return [];
        }

        // Única consulta agrupada, limitada às versões publicadas,
        // com LEFT JOIN restrito ao aluno/empresa autenticados.
        // Não contam conclusões de versões arquivadas nem rascunhos.
        $versionIds = array_map(static fn (stdClass $c): int => (int) $c->version_id, $courses);
        $counts = DB::table('educational_lessons as l')
            ->leftJoin('educational_lesson_progress as p', function ($join) use ($org, $grant): void {
                $join->on('p.educational_lesson_id', '=', 'l.id')
                    ->where('p.educational_organization_id', '=', $org)
                    ->where('p.subject_key', '=', $grant->subjectId);
            })
            ->whereIn('l.educational_course_version_id', $versionIds)
            ->where('l.is_published', true)
            ->groupBy('l.educational_course_version_id')
            ->select('l.educational_course_version_id')
            ->selectRaw('COUNT(l.id) AS lessons_total')
            ->selectRaw('COUNT(p.id) AS lessons_completed')
            ->get()
            ->keyBy('educational_course_version_id');

        if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return [];
        }

        foreach ($courses as $course) {
            $totals = $counts->get($course->version_id);
            $course->lessons_total = (int) ($totals->lessons_total ?? 0);
            $course->lessons_completed = (int) ($totals->lessons_completed ?? 0);
            $course->progress_percent = $course->lessons_total > 0
                ? (int) round(100 * $course->lessons_completed / $course->lessons_total)
                : 0;
        }

        return $courses;
    }

    public function lesson(PortalGrant $grant, int $lessonId): ?stdClass
    {
        $org = $this->orgId($grant);
        if ($org === null || $lessonId < 1) {
            return null;
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return null;
        }

        $lesson = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('l.id', $lessonId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->where('l.is_published', true)
            ->select('l.id', 'l.slug', 'l.title', 'l.body', 'l.sort_order', 'c.id as course_id',
                'v.version as course_version')
            ->first();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $lesson : null;
    }

    /**
     * Aulas da versão publicada com o estado do aluno/empresa autenticados.
     * Não retorna IDs de progresso ou dados de outros alunos.
     *
     * @return array<int, stdClass>
     */
    public function lessons(PortalGrant $grant, int $courseId): array
    {
        $org = $this->orgId($grant);
        if ($org === null || $courseId < 1) {
            return [];
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return [];
        }

        $lessons = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->leftJoin('educational_lesson_progress as p', function ($join) use ($org, $grant): void {
                $join->on('p.educational_lesson_id', '=', 'l.id')
                    ->where('p.educational_organization_id', '=', $org)
                    ->where('p.subject_key', '=', $grant->subjectId);
            })
            ->where('c.id', $courseId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->where('c.is_published', true)
            ->where('v.status', 'published')
            ->where('l.is_published', true)
            ->orderBy('l.sort_order')->orderBy('l.id')
            ->select('l.id', 'l.slug', 'l.title', 'l.sort_order')
            ->selectRaw('CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS completed')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $lessons : [];
    }

    /**
     * Leitura privada e limitada do histórico do aluno autenticado.
     * Inclui versões arquivadas para que a retirada de um curso do ar não
     * destrua seu histórico, mas nunca inclui dados de outra empresa/aluno.
     * Null = indisponível/negação conservadora, não substitui Portal SSO.
     *
     * @return array{schema_version:int,scope:string,completions:list<array<string,int|string>>}|null
     */
    public function exportProgress(PortalGrant $grant): ?array
    {
        $org = $this->orgId($grant);
        $editorialOrg = $this->contentOrgId();
        if ($org === null || $editorialOrg === null) {
            return null;
        }

        $entries = DB::table('educational_lesson_progress as p')
            ->join('educational_lessons as l', 'l.id', '=', 'p.educational_lesson_id')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
            ->where('p.educational_organization_id', $org)
            ->where('p.subject_key', $grant->subjectId)
            ->where('c.educational_organization_id', $editorialOrg)
            ->where('c.is_shared', true)
            ->whereIn('v.status', ['published', 'archived'])
            ->orderBy('p.id')
            ->limit(5001)
            ->get(['c.slug as course_slug', 'v.version as course_version',
                'l.slug as lesson_slug', 'p.completed_at'])
            ->all();

        // Nunca exportar parcialmente como se fosse um histórico completo.
        if (count($entries) > 5000 || !$this->grantUsable($grant, PortalAccessGate::VIEW)) {
            return null;
        }

        return [
            'schema_version' => 1,
            'scope' => 'current_authenticated_student',
            'completions' => array_map(
                static fn (stdClass $item): array => [
                    'course_slug' => (string) $item->course_slug,
                    'course_version' => (int) $item->course_version,
                    'lesson_slug' => (string) $item->lesson_slug,
                    'completed_at' => (string) $item->completed_at,
                ],
                $entries,
            ),
        ];
    }

    public function isComplete(PortalGrant $grant, int $lessonId): ?bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $this->lesson($grant, $lessonId) === null) {
            return null;
        }

        $completed = DB::table('educational_lesson_progress')
            ->where('educational_organization_id', $org)
            ->where('subject_key', $grant->subjectId)
            ->where('educational_lesson_id', $lessonId)
            ->exists();

        return $this->grantUsable($grant, PortalAccessGate::VIEW) ? $completed : null;
    }

    public function complete(PortalGrant $grant, int $lessonId): bool
    {
        $org = $this->orgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        $editorialOrg = $this->contentOrgId();
        if ($editorialOrg === null) {
            return false;
        }

        return DB::transaction(function () use ($grant, $lessonId, $org, $editorialOrg): bool {
            // Descobrir o curso sem confiar em course_id enviado pelo navegador.
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $editorialOrg)
                ->where('c.is_shared', true)
                ->value('c.id');

            if ($courseId === null) {
                return false;
            }

            // Mesma ordem de lock da publicação: primeiro curso, depois aula.
            // Impede concluir aulas enquanto o editor arquiva/publica versões.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $editorialOrg)
                ->where('is_shared', true)
                ->where('is_published', true)
                ->lockForUpdate()
                ->first(['id']);

            if ($course === null) {
                return false;
            }

            // Validar novamente a versão e a aula sob bloqueio do curso.
            $lesson = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $editorialOrg)
                ->where('c.is_shared', true)
                ->where('c.is_published', true)
                ->where('v.status', 'published')
                ->where('l.is_published', true)
                ->first(['l.id']);

            if ($lesson === null) {
                return false;
            }

            // A permissão pode expirar enquanto o banco espera por lock.
            if (!$this->grantUsable($grant, PortalAccessGate::VIEW)) {
                return false;
            }

            $now = now();
            // A restrição UNIQUE permite repetição idempotente.
            // Só declarar sucesso depois de confirmar que existe o
            // registro EXATO deste aluno, nesta empresa e nesta aula.
            $inserted = DB::table('educational_lesson_progress')->insertOrIgnore([
                'educational_organization_id' => $org,
                'subject_key' => $grant->subjectId,
                'educational_lesson_id' => $lessonId,
                'completed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($inserted === 1) {
                return true;
            }

            // insertOrIgnore também pode retornar 0 por conflitos que não
            // sejam a duplicidade esperada. Nunca produzir sucesso fictício.
            return DB::table('educational_lesson_progress')
                ->where('educational_organization_id', $org)
                ->where('subject_key', $grant->subjectId)
                ->where('educational_lesson_id', $lessonId)
                ->exists();
        });
    }

    /**
     * Registro atômico junto à mutação editorial.
     * Não registrar conteúdo, IP, tokens de Portal, segredo ou dados de cobrança.
     */
    private function audit(
        PortalGrant $grant,
        int $editorialOrg,
        string $action,
        string $kind,
        int $resourceId,
    ): void {
        if (
            !$this->grantUsable($grant, PortalAccessGate::MANAGE) ||
            $grant->companyId !== self::EDITORIAL_ORGANIZATION_KEY
        ) {
            throw new \LogicException('Auditoria exige identidade editorial válida.');
        }

        DB::table('educational_audit_events')->insert([
            'educational_organization_id' => $editorialOrg,
            'actor_key' => $grant->subjectId,
            'action' => $action,
            'resource_kind' => $kind,
            'resource_id' => $resourceId,
            'authority_revision' => $grant->revision,
            'occurred_at' => now(),
        ]);
    }

    /** @return array<int, stdClass> */
    /**
     * Bounded read-only editorial history scoped to the authorized operator.
     * Actor identifier is intentionally never included in the HTTP response.
     *
     * @return array{events:array<int,stdClass>,next_before_id:int|null}
     */
    public function adminAudit(PortalGrant $grant, ?int $beforeId = null): array
    {
        $empty = ['events' => [], 'next_before_id' => null];
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return $empty;
        }

        $query = DB::table('educational_audit_events')
            ->where('educational_organization_id', $org);
        if ($beforeId !== null) {
            $query->where('id', '<', $beforeId);
        }
        $rows = $query->orderByDesc('id')->limit(51)
            ->get(['id', 'action', 'resource_kind', 'resource_id',
                'authority_revision', 'occurred_at'])->all();

        if (!$this->grantUsable($grant, PortalAccessGate::MANAGE)) {
            return $empty;
        }

        $more = count($rows) > 50;
        $events = array_slice($rows, 0, 50);
        return [
            'events' => $events,
            'next_before_id' => $more && $events !== []
                ? (int) $events[count($events) - 1]->id
                : null,
        ];
    }

    public function adminCourses(PortalGrant $grant): array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return [];
        }

        $courses = DB::table('educational_courses')
            ->where('educational_organization_id', $org)
            ->where('is_shared', true)
            ->orderBy('sort_order')->orderBy('id')
            ->select('id', 'slug', 'title', 'summary', 'category', 'sort_order', 'is_published')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? $courses : [];
    }

    public function adminLessons(PortalGrant $grant, int $courseId): array
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return [];
        }

        // Mesmo na administração, nunca consultar uma versão de outro tenant.
        $course = DB::table('educational_courses')
            ->where('id', $courseId)
            ->where('educational_organization_id', $org)
            ->where('is_shared', true)
            ->first(['id']);
        if ($course === null) {
            return [];
        }

        $versionId = DB::table('educational_course_versions')
            ->where('educational_course_id', $courseId)
            ->orderByDesc('version')
            ->value('id');
        if ($versionId === null) {
            return [];
        }

        $lessons = DB::table('educational_lessons as l')
            ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
            ->where('v.id', $versionId)
            ->orderBy('l.sort_order')->orderBy('l.id')
            ->select('l.id', 'l.slug', 'l.title', 'l.body', 'l.sort_order', 'l.is_published', 'v.status')
            ->get()->all();

        return $this->grantUsable($grant, PortalAccessGate::MANAGE) ? $lessons : [];
    }

    /** @param array{slug:string,title:string,category:string,summary?:string|null,sort_order?:int} $input */
    public function createCourse(PortalGrant $grant, array $input): ?int
    {
        $org = $this->adminOrgId($grant);
        if ($org === null) {
            return null;
        }

        return DB::transaction(function () use ($grant, $org, $input): int {
            $now = now();
            $id = DB::table('educational_courses')->insertGetId([
                'educational_organization_id' => $org,
                'is_shared' => true,
                'slug' => $input['slug'],
                'title' => $input['title'],
                'category' => $input['category'],
                'summary' => $input['summary'] ?? null,
                'sort_order' => $input['sort_order'] ?? 0,
                'is_published' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('educational_course_versions')->insert([
                'educational_course_id' => $id,
                'version' => 1,
                'status' => 'draft',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($grant, $org, 'course.created', 'course', (int) $id);
            return (int) $id;
        });
    }

    /** @param array{title:string,summary?:string|null,category:string,sort_order?:int} $input */
    public function updateCourse(PortalGrant $grant, int $courseId, array $input): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $input): bool {
            // Lock igual ao utilizado por publish/unpublish e operações de aula:
            // a verificação de rascunho e a edição devem ser atômicas.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id']);

            if ($course === null) {
                return false;
            }

            $changed = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->update([
                    'title' => $input['title'],
                    'summary' => $input['summary'] ?? null,
                    'category' => $input['category'],
                    'sort_order' => $input['sort_order'] ?? 0,
                    'updated_at' => now(),
                ]) > 0;

            if ($changed) {
                $this->audit($grant, $org, 'course.updated', 'course', $courseId);
            }

            return $changed;
        });
    }

    /** @param array{slug:string,title:string,body:string,sort_order?:int} $input */
    public function addLesson(PortalGrant $grant, int $courseId, array $input): ?int
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return null;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $input): ?int {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return null;
            }

            $version = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->where('status', 'draft')
                ->orderByDesc('version')->first(['id']);
            if ($version === null) {
                return null;
            }

            $now = now();
            $lessonId = (int) DB::table('educational_lessons')->insertGetId([
                'educational_course_version_id' => $version->id,
                'slug' => $input['slug'],
                'title' => $input['title'],
                'body' => $input['body'],
                'sort_order' => $input['sort_order'] ?? 0,
                'is_published' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($grant, $org, 'lesson.created', 'lesson', $lessonId);
            return $lessonId;
        });
    }

    /** @param array{title:string,body:string,sort_order?:int} $input */
    public function updateLesson(PortalGrant $grant, int $lessonId, array $input): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $lessonId, $input): bool {
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->value('c.id');
            if ($courseId === null) {
                return false;
            }

            // Mesma ordem do publish/unpublish: trava curso antes da aula.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return false;
            }

            $row = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->where('c.is_published', false)
                ->where('v.status', 'draft')
                ->select('l.id')->first();
            if ($row === null) {
                return false;
            }

            $changed = DB::table('educational_lessons')->where('id', $row->id)->update([
                'title' => $input['title'],
                'body' => $input['body'],
                'sort_order' => $input['sort_order'] ?? 0,
                'updated_at' => now(),
            ]) > 0;
            if ($changed) {
                $this->audit($grant, $org, 'lesson.updated', 'lesson', $lessonId);
            }
            return $changed;
        });
    }

    /**
     * Exclui somente aula de rascunho editorial ainda não publicada e sem
     * progresso. Mantém versões publicadas/arquivadas e histórico intactos.
     */
    public function deleteDraftLesson(PortalGrant $grant, int $lessonId): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $lessonId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $lessonId): bool {
            $courseId = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->value('c.id');

            if ($courseId === null) {
                return false;
            }

            // Mesma ordem de lock da publicação: curso antes da aula.
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id']);

            if ($course === null) {
                return false;
            }

            $lesson = DB::table('educational_lessons as l')
                ->join('educational_course_versions as v', 'v.id', '=', 'l.educational_course_version_id')
                ->join('educational_courses as c', 'c.id', '=', 'v.educational_course_id')
                ->where('l.id', $lessonId)
                ->where('c.id', $courseId)
                ->where('c.educational_organization_id', $org)
                ->where('c.is_shared', true)
                ->where('c.is_published', false)
                ->where('v.status', 'draft')
                ->where('l.is_published', false)
                ->first(['l.id']);

            if ($lesson === null) {
                return false;
            }

            // Mesmo diante de dados legados inconsistentes, preservar
            // conclusões existentes e recusar exclusão em cascata.
            if (DB::table('educational_lesson_progress')
                ->where('educational_lesson_id', $lessonId)->exists()) {
                return false;
            }

            $deleted = DB::table('educational_lessons')
                ->where('id', $lessonId)
                ->where('is_published', false)
                ->delete() === 1;

            if ($deleted) {
                $this->audit($grant, $org, 'lesson.deleted', 'lesson', $lessonId);
            }

            return $deleted;
        });
    }

    /**
     * Deleta APENAS um curso que jamais foi publicado: exatamente uma versão
     * draft, sem aulas publicadas, versões históricas nem progresso registrado.
     * A ordem das exclusões respeita as FKs RESTRICT e a auditoria é atômica.
     */
    public function deleteNeverPublishedCourse(PortalGrant $grant, int $courseId): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId): bool {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)
                ->lockForUpdate()
                ->first(['id']);
            if ($course === null) {
                return false;
            }

            $versions = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id', 'status']);

            // A single draft version is required. Prior publication leaves
            // archived versions and blocks deletion forever.
            if ($versions->count() !== 1 || $versions[0]->status !== 'draft') {
                return false;
            }
            $versionId = (int) $versions[0]->id;

            $lessonIds = DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->pluck('id')->all();

            if (DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->where('is_published', true)->exists()) {
                return false;
            }

            if ($lessonIds !== [] && DB::table('educational_lesson_progress')
                ->whereIn('educational_lesson_id', $lessonIds)->exists()) {
                return false;
            }

            // If foreign key constraints or concurrent writes disagree,
            // the transaction throws and rolls back everything.
            $deletedLessons = DB::table('educational_lessons')
                ->where('educational_course_version_id', $versionId)
                ->where('is_published', false)->delete();
            if ($deletedLessons !== count($lessonIds)) {
                throw new \RuntimeException('Draft course changed during deletion.');
            }

            $deletedVersion = DB::table('educational_course_versions')
                ->where('id', $versionId)
                ->where('status', 'draft')->delete();
            if ($deletedVersion !== 1) {
                throw new \RuntimeException('Draft course version changed during deletion.');
            }

            $deletedCourse = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
                ->where('is_shared', true)
                ->where('is_published', false)->delete();
            if ($deletedCourse !== 1) {
                throw new \RuntimeException('Draft course changed during deletion.');
            }

            $this->audit($grant, $org, 'course.deleted', 'course', $courseId);
            return true;
        });
    }

    public function setPublished(PortalGrant $grant, int $courseId, bool $publish): bool
    {
        $org = $this->adminOrgId($grant);
        if ($org === null || $courseId < 1) {
            return false;
        }

        return DB::transaction(function () use ($grant, $org, $courseId, $publish): bool {
            $course = DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->where('is_published', !$publish)
                ->lockForUpdate()->first(['id']);
            if ($course === null) {
                return false;
            }

            $version = DB::table('educational_course_versions')
                ->where('educational_course_id', $courseId)
                ->where('status', $publish ? 'draft' : 'published')
                ->orderByDesc('version')
                ->lockForUpdate()->first(['id', 'version']);
            if ($version === null) {
                return false;
            }

            $lessons = DB::table('educational_lessons')
                ->where('educational_course_version_id', $version->id)
                ->orderBy('sort_order')->orderBy('id')
                ->get(['slug', 'title', 'body', 'sort_order']);

            if ($publish) {
                if ($lessons->isEmpty()) {
                    return false;
                }
                foreach ($lessons as $lesson) {
                    if (trim((string) $lesson->title) === '' || trim((string) $lesson->body) === '') {
                        return false;
                    }
                }
            }

            $now = now();
            if ($publish) {
                DB::table('educational_lessons')
                    ->where('educational_course_version_id', $version->id)
                    ->update(['is_published' => true, 'updated_at' => $now]);
                DB::table('educational_course_versions')
                    ->where('id', $version->id)
                    ->update(['status' => 'published', 'updated_at' => $now]);
            } else {
                // Retirar do ar imediatamente. Versão publicada torna-se
                // imutável: os progressos permanecem vinculados a aulas antigas.
                DB::table('educational_lessons')
                    ->where('educational_course_version_id', $version->id)
                    ->update(['is_published' => false, 'updated_at' => $now]);
                DB::table('educational_course_versions')
                    ->where('id', $version->id)
                    ->update(['status' => 'archived', 'updated_at' => $now]);

                $draftId = DB::table('educational_course_versions')->insertGetId([
                    'educational_course_id' => $courseId,
                    'version' => (int) $version->version + 1,
                    'status' => 'draft',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                // Novos IDs preservam o histórico das aulas antigas.
                foreach ($lessons as $lesson) {
                    DB::table('educational_lessons')->insert([
                        'educational_course_version_id' => $draftId,
                        'slug' => $lesson->slug,
                        'title' => $lesson->title,
                        'body' => $lesson->body,
                        'sort_order' => $lesson->sort_order,
                        'is_published' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }

            DB::table('educational_courses')
                ->where('id', $courseId)
                ->where('educational_organization_id', $org)
            ->where('is_shared', true)
                ->update(['is_published' => $publish, 'updated_at' => $now]);

            $this->audit(
                $grant,
                $org,
                $publish ? 'course.published' : 'course.unpublished',
                'course',
                $courseId
            );
            return true;
        });
    }

}
