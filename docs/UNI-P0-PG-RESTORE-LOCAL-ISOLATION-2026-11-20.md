# UNI P0 — isolamento da origem/destino do ensaio de restore PG18

20/11/2026 · DRAFT · **HOLD_NO_GO / não é homologação privada**.

## Lacuna nova demonstrável

O ensaio existente `scripts/qa-pg-backup-restore.sh` valida os 10 cursos, 35 aulas,
fingerprints, estrutura SQL e adulteração em cópia restaurada, mas os utilitários
`psql`, `pg_dump`, `createdb`, `pg_restore` e `dropdb` ainda aceitavam
redirecionamento por variáveis libpq como `PGHOST` e `PGPORT`.
Em execução inadvertidamente contaminada, um ensaio destrutivo poderia usar
uma conexão PostgreSQL diferente da instância **local do contêiner QA**.
As variáveis `POSTGRES_DB=uni_ci` sozinhas não garantem o endpoint real.

## Correção restrita

- Recusar variáveis libpq que substituem host, porta, banco, usuário, serviço,
  senha ou opções de conexão **antes da primeira consulta**.
- Fixar socket Unix `/var/run/postgresql` e TCP port 5432 em todos os
  cinco utilitários. Exigir `inet_server_addr() IS NULL` na conexão efetiva.
- Validar guardas por testes negativos **sem banco**: cada override deve
  provocar saída 2 sem tocar PostgreSQL, sem imprimir valor injetado.
- Preservar o ensaio completo de restore anterior, sem reexecutá-lo por mudança
  apenas no fence e sem reescrever resultados já verdes.

## Evidência e limites

A nova run de push deve ser conferida pela **SHA final**, e não considerada
aprovada se estiver pendente/cancelada. O teste novo confirma apenas negação
de endpoint desviado e fixação do socket; não confirma restauração bem-sucedida
nesta SHA, RPO/RTO, permissões/owners/ACLs (o dump original usa
`--no-owner --no-acl`), backups cifrados, reversão de migration, ou restore
em VPS. A prova positiva PG18 anterior mantém sua SHA e run próprias.

A candidata editorial [#149](https://github.com/rafhael100/imagine-universidade/pull/149)
e o aceite pedagógico humano ficam intactos. A integração real Portal
[#848](https://github.com/rafhael100/imagine-portal/issues/848) /
[#886](https://github.com/rafhael100/imagine-portal/issues/886)
continua sem owner/fonte oficial homologados, sem grants ou SSO; `deny-all`
permanece obrigatório. Os 13 gates de `ops/release-gates.json` seguem
`NOT_VERIFIED`. Nenhum merge, deploy, main, VPS, DNS, cliente, contrato ou gasto.

**Próxima prova:** ensaio de restauração/rollback operacional privado, com
artefatos imutáveis, DBA, compatibilidade de schema, saúde, tempo de recuperação
e autorização específica, depois dos bloqueios correspondentes do checklist #12.
