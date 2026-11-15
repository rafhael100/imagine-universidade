# UNI C-19 — catálogo inicial sintético e idempotente no QA

**15/11/2026 · candidato de QA; sem publicação, merge ou deploy**

## Para que serve

Os três cursos e oito aulas já existentes em `content/mvp-cursos-v1.json` estão aprovados apenas como **rascunhos editoriais**, com foco nos pilares **Visitas → Leads → Clientes**. Antes, o laboratório exigia digitar tudo pelo painel Admin. Esta entrega automatiza a preparação **exclusivamente em ambiente de testes**.

## Implementado

- `UniversityEditorialFixtureImporter` valida rigidamente versão 1 do manifesto, `status=editorial_draft`, `audience=authorized_imagine_clients_only`, slugs, categorias, títulos, textos e unicidade **antes de qualquer transação**.
- Comando Artisan `university:load-synthetic-editorial --confirm-synthetic` disponível somente via CLI; sem flag, rejeita antes de gravar. O serviço rejeita `APP_ENV` diferente de `testing`, e bancos que não sejam SQLite ou PostgreSQL.
- Importa apenas no tenant fictício `imagine-editorial`, com `is_shared=true`, `is_published=false`, uma versão `draft` e aulas não publicadas. Não cria contas de clientes, não configura SSO, não insere progresso, não manipula pagamentos e não concede grants.
- Em execuções posteriores, preserva cursos existentes e **não sobrescreve edições ou versões**, nem apaga histórico. Resultado esperado primeira execução: 3 cursos/8 aulas; segunda: zero criados, três preservados.
- Quatro testes Feature escritos: confirmação obrigatória, quantidade/situação correta, repetição sem perda de edição e recusa em ambiente diferente de testing.
- O workflow de QA GitHub e o laboratório Docker também executam a carga duas vezes **após** os testes relacionais em PostgreSQL 18 sintético. As falhas são fatais para a execução de CI.

## Segurança e limites

Esta é carga de demonstração, não funcionalidade de produção. O comando não deve ser habilitado para cliente, administrador real ou VPS com dados reais. A homologação desta PR não autoriza publicar automaticamente os cursos: **a publicação continua uma operação administrativa protegida**.

A universidade operacional continua sem SSO/elegibilidade real do Portal; a autenticação padrão permanece `UnavailablePortalAuthority`.

## Critérios de aceite

A execução do GitHub Actions precisa passar PHP 8.3, testes PHPUnit Unit e Feature, migrações PG18, verificação de isolamento/restrições e dupla carga de 3 cursos/8 aulas. Confirmar logs e eventuais regressões antes de usar a saída para demonstrar o catálogo.

**NO-MERGE / NO-DEPLOY até gates do Portal, AppSec/DBA/LGPD e segurança serem concluídos.**


## Ensaio Cliente/Admin com o catálogo importado

A suíte Feature foi estendida para uma operação completa com dados sintéticos: o editor fictício carrega os três cursos, publica cada um pelo endpoint protegido, e dois clientes fictícios consultam os três cursos/oito conteúdos. O cliente A conclui uma aula, o cliente B não vê seu progresso, e nenhum cliente recebe permissão de administração. **Essa autoridade de teste é injetada exclusivamente dentro do PHPUnit**; não existe SSO real nem acesso a dados de clientes.


## Ensaio adicional de contêineres

O workflow de QA controlado por rótulo ganhou um segundo job `isolated-compose`, dependente do sucesso de `isolated-tests`. Ele roda exclusivamente no runner Ubuntu descartável e executa `scripts/run-qa-compose.sh`: construção de PHP 8.3, libsodium, PostgreSQL 18 em `tmpfs`, testes Unit/Feature e duas importações sintéticas. O Compose **não publica portas**, não usa bind mounts, não possui secrets de produção e remove volumes/serviços ao encerrar.

Este job é uma **verificação candidata da infraestrutura** e não implica autorização para usar a VPS ou hospedar clientes. O resultado de GitHub Actions deve ser conferido antes de considerá-lo aprovado.


## Homologação real de Docker Compose — aprovada

[GitHub Actions #43762244236](https://github.com/rafhael100/imagine-universidade/actions/runs/43762244236), commit `a5c9cff2ff6d699081703eb305f9750cf1252719`: **success** nos dois jobs `isolated-tests` e `isolated-compose`.

Falhas detectadas e corrigidas no próprio QA Docker:
- O Dockerfile não incluía `libsqlite3-dev` para compilar `pdo_sqlite`. Dependência adicionada.
- O diretório `tmpfs` do PostgreSQL 18 tinha modo 0700, impedindo a inicialização do processo sob o usuário `postgres`. Ajustado para modo 1777 **apenas no contêiner efêmero**, mantendo `PGDATA` protegido conforme o entrypoint PostgreSQL.
- O wrapper agora registra os últimos logs do banco sintético quando o job falhar, antes de apagar os contêineres.

Resultado registrado dentro dos contêineres: PHP 8.3.36, **66 PHPUnit/406 asserções**, oito verificações estruturais de PG, oito verificações relacionais com rollback, três cursos/oito aulas em rascunho e segunda carga sem duplicação. O log termina com `PASS: disposable QA run finished. Removing services and data.`

Essa homologação **não liga serviços reais, não cria endpoint público, não usa a VPS e não habilita grants do Portal**.
