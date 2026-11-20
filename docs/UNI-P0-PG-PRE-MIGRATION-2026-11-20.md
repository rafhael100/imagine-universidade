# UNI P0 — conexão PostgreSQL efetiva ANTES de migrações

**20/11/2026 — candidata de laboratório, nunca autorização de deploy.**

Lacuna objetiva: o Compose de QA executava `migrate:fresh` após verificar variáveis de ambiente, mas **sem** interrogar a configuração Laravel efetiva nem autenticar uma consulta SQL ao PostgreSQL 18 antes do primeiro DDL. Essa lacuna não significa que as migrações anteriores foram inseguras ou que os testes já aprovados falharam.

Esta revisão insere `php scripts/qa-pg-pre-migrate.php` **depois do Composer lock e antes de migrations** no entrypoint Docker. O script só aceita o par sintético fixo `127.0.0.1:5432 / uni_ci / uni_ci`, ausência de arquivos de configuração e overrides libpq, execução isolada, driver `pdo_pgsql`, configuração efetiva do Laravel e consulta SQL autenticada de identidade, PostgreSQL 18, porta e endereço de conexão válido (o endereço observado no servidor pode ser traduzido pelo NAT do serviço Docker, mesmo com DB_HOST=127.0.0.1). Falhas são `HOLD`, sem imprimir DSN nem exceções. O script é somente leitura.

O workflow isolado `uni-p0-pg-pre-migrate-qa.yml` exercita cenários negativos, Composer lock, consulta SQL **antes** de `artisan migrate` e inspeção de schema em PostgreSQL 18 descartável da própria CI. O ensaio não acessa VPS, contratos, Portal operacional nem clientes. O workflow não substitui a suíte integrada da PR #85 nem prova rollback real.

**Nota de fronteira:** esta pré-verificação é para o banco `uni_ci` na interface local de laboratório; o ensaio privado de três contêineres usa banco, usuário e host diferentes e conserva suas próprias guardas. Não reutilizar o preflight de loopback para alterar essa topologia sem revisão isolada.

**Provas necessárias fora da CI:** designação da autoridade Portal #886, sessão business/MFA e `university:view/manage` segregados (Portal #848), serviço oficialmente ativo/competência/SKU/revogação independente, segurança, homologação privada Cliente/Admin, restore/rollback operacional e aceite humano editorial. Os 13 gates em `ops/release-gates.json` permanecem `NOT_VERIFIED`; `HOLD_NO_GO`.

**Rastreabilidade:** base da PR sucessora editorial #149 SHA `56ddb1f1eb28b6f5bb091335b734f3afeeffea5f`; #85 é somente referência integrada. Não modifica material editorial, serviço de autenticação, main, DNS nem produção.
