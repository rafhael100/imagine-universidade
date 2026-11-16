# UNI C-07 — consistência e verificação segura

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Correções realizadas
1. **Conclusão de aulas:** quando um aluno conclui uma aula, o banco primeiro identifica o curso, bloqueia a linha do curso publicado e então revalida aula e versão na mesma transação. Isto harmoniza a ordem de bloqueios com a operação administrativa de publicação/retirada do ar.
2. **Edição de aulas:** também bloqueia o curso antes de alterar a aula em rascunho, evitando edição concorrente de versão que está sendo publicada.
3. **Cabeçalhos privados:** a verificação do Portal agora aplica no-store, no-cache, anti-frame, noindex, nosniff e política de referência para respostas protegidas **inclusive quando nega o acesso**.
4. **Teste HTTP de negativas:** ampliado para conferir cabeçalhos de segurança e cache após 403.
5. **Verificador local:** scripts/check-local.sh executa apenas leitura/lint de PHP, validação Composer e PHPUnit quando dependências e pdo_sqlite estiverem presentes. **Não instala pacotes, não habilita CI e não inicia servidor/DB.**

## Qualidade e limites
- A organização dos locks diminui risco de inversão entre edição/publicação/conclusão. **Não prova ausência de deadlock sem execução concorrente no PostgreSQL real.**
- Os testes PHP/Feature permanecem escritos, não executados nesta rodada: runtime de trabalho com PHP disponível, mas sem Composer, extensões PDO SQLite/PostgreSQL e sem acesso a um banco efêmero autorizado.
- O script Bash foi verificado sintaticamente em ambiente isolado, mas as suítes de aplicação só poderão rodar quando dependências estiverem presentes.
- O provider Portal continua fail-closed; nenhuma rota real liberada.

## Próximo gate verificável
1. Disponibilizar ambiente de testes isolado com PHP, Composer, SQLite (Feature), PostgreSQL da homologação e lockfile verificado, sem acesso a segredos de produção.
2. Executar scripts/check-local.sh, registrar resultados e corrigir eventuais falhas.
3. Validar DDL, transações e concorrência de `publish/unpublish/updateLesson/complete` sob PostgreSQL com duas sessões.
4. Aprovar contrato Portal de identidade, serviço elegível e revogação; em seguida habilitar a integração em homologação controlada.
5. Revisão de segurança/LGPD, auditoria administrativa, backup e reversão antes de publicação.

**Sem gastos externos, merge, deploy ou uso de clientes reais.**
