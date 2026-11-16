# UNI C-09 — testes executáveis sem dependências e unicidade de versões

**15/11/2026 — DRAFT, NO-MERGE, NO-DEPLOY**

## Resultado verificado em PHP 8.4

Os arquivos de domínio e os scripts de teste foram copiados para um ambiente isolado. A integridade foi confirmada por `git hash-object`: os hashes Git dos 8 arquivos PHP do domínio e dos 2 scripts de teste coincidem exatamente com os blobs da branch desta entrega.

- `php scripts/check-access-domain.php`: **16 casos aprovados, 0 falhas**. Casos incluem permissão exata, identidade e empresa, status de autorização, revisão, expiração, limite de validade, sessão ausente, exceção e provedor que sempre nega.
- `php scripts/check-learning-mock.php`: **15 casos aprovados, 0 falhas**. Casos incluem idempotência, progresso independente por aluno, aulas/curso não publicados, revogação, serviço não elegível, trial isolado, vínculo e permissão.
- Ambos executam diretamente arquivos reais do domínio, **sem framework**, usando exclusivamente dados fictícios. O segundo conjunto testa a política mock antiga; **não** substitui os testes do catálogo editorial global no PostgreSQL.

## Restrição de versões no banco

Migração candidata `2026_11_15_000004_enforce_one_live_course_version.php`:
- Um índice único parcial permite no máximo **uma** versão com status `draft` por curso.
- Outro índice único parcial permite no máximo **uma** versão `published` por curso.
- Várias versões `archived` continuam permitidas para preservar histórico de aulas e progresso.
- Não é executada automaticamente; dados pré-existentes inconsistentes devem resultar em erro, **não em exclusão silenciosa**.

As duas sentenças SQL de índices foram verificadas em um banco SQLite `:memory:` através da biblioteca padrão da linguagem Python. Os casos de duplicidade de draft/published foram recusados, versões archived coexistiram e cursos distintos continuaram independentes. Esta prova de SQL **não executou a migração Laravel** nem valida ainda PostgreSQL.

`tests/Feature/CourseVersionConstraintTest.php` foi adicionado como regressão de banco de laboratório, com os mesmos quatro cenários; **a execução PHPUnit ainda está pendente**.

## Comandos no checkout da branch (somente sandbox)

1. `php scripts/check-access-domain.php`
2. `php scripts/check-learning-mock.php`
3. `bash scripts/check-local.sh` para lint PHP/Composer/PHPUnit, **apenas se o ambiente estiver completo e isolado**.
4. `node scripts/check-ui-contract.mjs` (Node 18+, sem dependências), para validar sintaxe JavaScript, CSRF, rotas protegidas, escape textual e manifesto de conteúdo.
5. Somente depois disso, executar os testes Laravel/SQLite e PostgreSQL com as dependências de homologação.
6. Quando houver PHP/Composer, pdo_sqlite e dependências aprovadas: `vendor/bin/phpunit --testsuite Unit` e `vendor/bin/phpunit --testsuite Feature`.
7. Executar migrações/concorrência em PostgreSQL 18 exclusivamente de homologação, com backup, banco descartável e rollback documentados.

## Inspeção estática adicional de UI

O script `scripts/check-ui-contract.mjs` foi incluído nesta branch. A inspeção direta dos arquivos da branch passou nos itens verificados: JavaScript das páginas Cliente/Admin, uso de `textContent`, CSRF/same-origin, rotas protegidas, bloqueio padrão do Portal, catálogo de três cursos em rascunho com oito aulas. O próprio script foi analisado sintaticamente, mas **a execução integral de Node dentro de um checkout da aplicação ainda não ocorreu**.

## Bloqueios atuais

- Não há `composer.lock` versionado e o ambiente disponível não dispõe de Composer, `pdo_sqlite` nem `pdo_pgsql`.
- A cópia privada integral do repositório não pôde ser clonada neste ambiente, pois não há conectividade de rede direta. A integração com GitHub foi feita pelo conector autorizado.
- Não foi executada a aplicação Laravel, migração via Artisan, PHPUnit, PostgreSQL, SSO ou navegador com sessão real.
- Portal não tem os códigos de permissão University homologados e mantém pré-verificação sem autorização de recurso. Ver [Portal #848](https://github.com/rafhael100/imagine-portal/issues/848).

**Estado final: 31 verificações PHP de domínio aprovadas; migração de proteção escrita e SQL isolado verificado; sistema operacional ainda NO-GO.** Nenhum deploy, merge, credencial ou custo externo.
