# UNI-C13 — preservação de histórico e edição segura de cursos

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Correções

O esquema inicial ainda usava ON DELETE CASCADE nas relações organização→curso, curso→versão, versão→aula, organização→progresso e aula→progresso. Isso poderia remover histórico educacional silenciosamente se um registro superior fosse excluído.

- As **cinco FKs de migrações candidatas** foram alteradas para ON DELETE RESTRICT.
- O método de edição de curso agora bloqueia a linha do curso com `lockForUpdate` e confere `is_published=false` sob o mesmo lock de publicar/despublicar. A edição de um curso já publicado não pode continuar por uma corrida.
- Os testes Feature foram ampliados para conferir título imutável após publicação e recusa de exclusão SQL com conteúdo/progresso dependentes.

## Teste executado

O script `scripts/check-sqlite-contract.py` foi ampliado e executado em SQLite `:memory:`, com `PRAGMA foreign_keys=ON`:

- 7/7 cenários originais: versão draft/published única, histórico archived, idempotência, conflito inesperado de conclusão e separação empresa/aluno;
- 5/5 novos cenários: impedir exclusão de aula, versão, curso e organização com dependentes, e preservar o registro de progresso depois das negativas.

**12/12 verificações passaram.** O arquivo Python executado no container tem hash Git **d74d9b1f756fd8bb9097fc9424707bb95fda126f**, igual ao blob retornado pelo GitHub.

As verificações reproduzem o modelo lógico SQLite; **não são migrações reais do Laravel, PostgreSQL nem testes de concorrência.**

## Observação crítica de migração

As alterações ocorreram nos arquivos das migrações-base **ainda em PR DRAFT e declaradamente não aplicadas em produção**. Se qualquer ambiente já tiver executado as migrações antigas, **editar os arquivos não modifica constraints existentes**. Nesse caso é necessário inventariar as FKs reais do banco e criar uma migração corretiva com plano de rollback, sem aplicar cegamente. Não executar `migrate:fresh` em ambiente com dados reais.

## Verificador PostgreSQL 18 preparado (não executado)

Foi criado `scripts/check-pg-schema.php`, somente para `APP_ENV=testing`, host `127.0.0.1`, banco e usuário sintéticos `uni_ci`. Ele consulta metadados de `pg_constraint` / `pg_indexes` em modo leitura e exige **seis FKs RESTRICT** (as cinco acima mais auditoria) e **dois índices únicos parciais** para uma versão publicada e uma draft.

O workflow de QA manual foi alterado para executar esse verificador **após** `php artisan migrate:fresh` no PostgreSQL descartável, e a validação Composer foi movida para depois da resolução de dependências. A checagem estática de guardas/somente leitura passou, mas **ainda não houve execução em PostgreSQL ou em GitHub Actions da Universidade**. O workflow não tem gatilho automático e não foi iniciado.

## Continuidade e gates

- Portal `university:view` / `university:manage` segue apenas em vocabulário, sem grants nem SSO operativo (Portal PR #856 / issue #848).
- Executar PHP lint, PHPUnit Feature, migrations e corridas de concorrência em PostgreSQL18 descartável; revisar custos e lockfile antes de rodar CI.
- Definir retenção e exclusão legal de progresso conforme LGPD, através de fluxo **explícito e auditado**, nunca cascata acidental.
- Revisar segurança/DBA/LGPD e manter bloqueios Gate C de merge e deploy.

**Sem publicação, merge, dados reais, fornecedores novos ou gastos nesta entrega.**
