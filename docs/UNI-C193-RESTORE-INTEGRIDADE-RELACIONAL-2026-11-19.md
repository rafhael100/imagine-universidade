# UNI C-193 — Prova relacional adicional da restauração PostgreSQL 18

19/11/2026 · Candidata em laboratório descartável; HOLD_NO_GO.

## Lacuna

O teste anterior restaurava o snapshot e comparava dez cursos, 35 aulas,
ausência de publicações/progresso e textos das aulas. Isso não comprova
que índices, restrições, RLS, sequências e as demais tabelas foram restauradas.

## Implementação

- Hash estrutural sobre tabelas, colunas, defaults, constraints, índices,
  triggers não internos, políticas/flags RLS e definições/estado de sequências.
- Hash de dados sobre todas as tabelas públicas, com ordenação canônica JSONB.
- Comparação dos dois fingerprints antes e depois do pg_restore.
- Restore com --single-transaction e --exit-on-error.
- Controle negativo: alterar uma aula somente na cópia restaurada, confirmar
  divergência do hash e garantir que o banco fonte permaneceu inalterado.
- Somente banco sintético uni_ci no PostgreSQL 18 efêmero de Docker Compose;
  dump e clone descartados via trap.

## Limites

O dump usa --no-owner --no-acl; permissões operacionais não são testadas.
Não demonstra backup remoto, cadência, retenção, RPO/RTO, rollback ou
restauração da VPS. O gate real_backup_restoration_and_rollback segue
NOT_VERIFIED. Exigir sucesso do docker-lab na HEAD exata.

Nenhum merge, deploy, SSO, login, cliente real ou alteração de infraestrutura.
