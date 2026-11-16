# UNI C-66 — matriz de privilégios mínimos no PostgreSQL do staging

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY. **Não executar manualmente em banco real sem revisão DBA.**

O arquivo `ops/staging/role-grants-candidate.sql` especifica permissões **DML necessárias** do runtime, separadas da conta *owner* que roda migrations. O runtime pode ler/cadastrar empresas verificadas, gerenciar cursos/versões/aulas sob controle de aplicação, gravar progresso e auditoria, manter sessões e o ledger de nonces; não pode alterar/apagar progresso ou auditoria nem fazer CREATE/TRUNCATE/DROP de tabelas. Não tem acesso à tabela de migrations, que pertence ao proprietário.

As sequências enumeradas são apenas as explicitamente necessárias, sem GRANT amplo de ALL. O script não contém senhas nem cria contas, e o nome da base/role de exemplo deve corresponder ao ambiente aprovado pelo DBA. O banco precisa estar isolado por projeto; não utilizar SQL em CRM, Portal ou Sites.

`php scripts/check-pg-runtime-roles.php` comprova o contrato em **PostgreSQL18 descartável** sob as condições fixas `APP_ENV=testing`, DB `uni_ci` e credenciais *fictícias*, criando uma role transitória, aplicando uma versão substituída do SQL, verificando DML e negação de CREATE/DELETE/UPDATE perigosos, e descartando role no final. Testes rodam tanto no CI PHP quanto no contêiner QA.

**Não é isolamento de linhas/tenants pelo SQL**: a aplicação precisa validar empresas por grant Portal e recursos; RLS futuro requer decisão técnica independente. Também não demonstra credenciais oficiais, contrato ativo, SSO, revogação, AppSec/DBA/LGPD ou homologação na VPS. Treze gates permanecem HOLD_NO_GO.
