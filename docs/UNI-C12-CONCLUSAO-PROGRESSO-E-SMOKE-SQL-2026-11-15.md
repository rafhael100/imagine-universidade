# UNI C-12 — conclusão confirmada e teste SQL reproduzível

**15/11/2026 — DRAFT · NO-MERGE · NO-DEPLOY.**

## Problema corrigido

O método de conclusão de aula anteriormente podia responder sucesso mesmo quando o banco ignorasse uma inserção por conflito inesperado.

A operação agora:
1. Confere empresa, curso publicado, versão e aula, com lock de curso.
2. Tenta inserir o progresso com chave única por empresa, usuário e aula.
3. Quando o banco insere uma linha, confirma a conclusão.
4. Quando o banco ignora a inserção, verifica a existência da **linha exata** do usuário, empresa e aula antes de declarar sucesso.
5. Não declara conclusão sem linha comprovada.

## Cenários PHPUnit preparados

- Conflito inesperado por índice secundário sintético: segundo registro não existe; API deve recusar sucesso.
- Tentativa de concluir aula antiga de versão arquivada: operação negada sem novo progresso.
- Testes anteriores permanecem para idempotência, tenant A/B, acesso negado, rascunhos e auditoria.

O índice adversarial é criado **apenas dentro do teste Feature SQLite**, não nas migrações reais.

## Evidências sem Composer

O script scripts/check-sqlite-contract.py usa somente Python padrão e SQLite em memória. **7 de 7 verificações passaram** nesta rodada: rascunho único, publicado único, versões arquivadas, cursos independentes, conclusão idempotente, conflito ignorado e progresso por empresa/usuário.

O hash Git do arquivo executado no contêiner corresponde exatamente ao hash retornado pelo GitHub para a mesma branch. O script scripts/check-local.sh agora inclui essa verificação quando Python 3 está disponível.

Os scripts PHP independentes de autorização e progresso sintético também foram reexecutados: **31 de 31 passaram**.

## Limites

**Não foram executados** PHPUnit, Artisan, migrações Laravel, PostgreSQL, autenticação Portal nem testes HTTP de navegador neste ambiente. Composer, composer.lock e drivers PDO SQLite/PostgreSQL continuam ausentes.

A integração com o Portal ainda requer permissões university:view/manage, fonte confiável de serviço elegível, revalidação e revogação (issue Portal #848). O provider padrão continua negando acesso.

O código é candidato e permanece em revisão. Não houve merge, deploy, dados reais, despesas ou alteração da VPS.
