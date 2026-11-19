# UNI ERD-R39/R40 — todos os documentos vinculados à fonte (DRAFT)

**Problema reproduzível:** antes deste lote, um operador podia alterar `cursos/01-*.md` ou `LEIA-PRIMEIRO.md`, recalcular a lista SHA-256 **não assinada**, e `--source` ainda aceitava o pacote. A origem dos 35 hashes das aulas estava vinculada, mas o texto visível ao revisor e as instruções não.

**R39:** extrair um renderizador determinístico compartilhado para os 10 Markdown de cursos; o gerador passa a usá-lo e o verificador `--source` compara os bytes de cada curso com a mesma função e a fonte versionada.

**R40:** vincular também `LEIA-PRIMEIRO.md` ao texto e índice esperados. Quatro regressões atualizam consistentemente os checksums locais após adulterar cursos/instruções; `--dir` continua verificando integridade local, `--source` recusa a divergência. Agora 42 negativos.

Reprodução sintética isolada: `node scripts/check-editorial-package-integrity.mjs`. Workflow `uni-erd-r39-source-documents-qa.yml` no branch de revisão, inclui integridade, auditorias e os 13 gates. **Nunca usar `--dir` como autenticação; nem `--source` é assinatura ou aprovação humana.** Todos os 35 itens seguem pendentes. Portal #886 e 13/13 gates `NOT_VERIFIED` / `HOLD_NO_GO`.

Sem merge/main, deploy, VPS, DNS, grants, SSO, clientes ou custos.
