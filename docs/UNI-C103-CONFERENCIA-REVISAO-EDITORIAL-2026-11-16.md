# UNI C-103 — conferir reivindicações de revisão editorial por hash

**16/11/2026 · PR #81 · homologação sintética / sem publicação**

## Objetivo

O pacote `UNI C-102` oferece 35 linhas no CSV de revisão. Depois que revisores humanos atualizarem a planilha, não se deve aceitar uma lista desatualizada de aprovações, identificadores repetidos ou conteúdo alterado após a revisão. Também não se deve transformar uma linha marcada como aprovada em permissão automática de publicar.

## Validador

Executar:

```sh
node scripts/validate-editorial-review.mjs --csv /caminho/para/revisao.csv
```

O script compara os **35 identificadores e hashes** com a fonte original atual `content/mvp-cursos-v1.json`. Aceita arquivos CSV gerados pelo sistema, inclusive variantes com separador `;` e BOM UTF-8 normalmente associados ao Excel em português do Brasil.

Os únicos estados aceitos são:
- `PENDING_HUMAN_REVIEW` — sem responsável ou evidência de aprovação.
- `NEEDS_CHANGES` — identifica revisão pendente, com nome de revisor e referência rastreável a issue/PR do repositório.
- `CLAIMED_HUMAN_APPROVED` — registro **não autenticado** de possível aprovação, com nome e link para futura inspeção humana.

O script rejeita linhas faltantes ou duplicadas, hash divergente, nomes insuficientes, links externos e estados não reconhecidos. Mesmo que as 35 linhas estejam marcadas como reivindicações de aprovação, o relatório mantém `review_evidence_authenticated=false`, `publishable=false` e `release_decision=HOLD_NO_GO`.

**Importante:** o validador apenas verifica integridade documental e formato. Não confirma a identidade real da pessoa, se o link possui um aceite válido, a qualidade do material ou cumprimento dos 13 gates operacionais.

## Testes e próximos passos

`scripts/check-editorial-review-validation.mjs` testa os estados pendente, mudanças necessárias, uma ou 35 reivindicações de aprovação, CSV do Excel, alteração de hash, fonte desconhecida, duplicação, revisor ausente, evidência externa e arquivo incompleto. O relatório estrutural pode acompanhar o pacote do GitHub Actions, mas nunca habilita publicação.

Para decidir a aprovação editorial, pessoas responsáveis precisam analisar os textos e evidências, assinar as revisões e reconciliar o conteúdo com segurança, acessibilidade e a fonte oficial de acesso do Portal. A branch continua em PR DRAFT e sem merge ou deploy.
