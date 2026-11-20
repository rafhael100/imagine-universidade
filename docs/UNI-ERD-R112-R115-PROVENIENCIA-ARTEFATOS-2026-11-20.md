# UNI ERD-R112–R115 — proveniência dos três artefatos editoriais (20/11/2026)

**Somente DRAFT / dados sintéticos:** nenhum artefato de revisão offline autentica pessoas, libera alunos, gera grants ou abre gates. **HOLD_NO_GO · 13/13 NOT_VERIFIED**.

## Lacuna encontrada
O pacote já verificava o HTML de prioridade contra a fonte e o renderizador versionados, mas não dispunha de um verificador uniforme para os arquivos **JSON** e **Markdown** gerados pela mesma fila de 35 aulas. Editar os artefatos fora do repositório poderia trocar avisos, títulos ou estados sem uma comparação canônica independente antes da leitura.

## Entregas
- **R112:** verificação em memória, byte a byte, dos três formatos, reconstruídos da fonte sintética versionada. Tolerância zero a BOM, CRLF, anexos, alterações de títulos, espaços finais ou campos extras.
- **R113:** 27 testes negativos (9 mutações × 3 formatos), incluindo fonte diferente, `GO` forjado e UTF-8 adulterado. Resposta positiva informa apenas **proveniência sintética**; nunca um aceite humano.
- **R114:** CLI somente-leitura por **stdin**, sem argumento de caminho, sem rede, com leitura limitada a 1 MiB durante a entrada; exemplos:
  ```sh
  node scripts/build-editorial-review-priority.mjs --json > /tmp/revisao.json
  node scripts/build-editorial-review-priority.mjs --markdown > /tmp/revisao.md
  node scripts/render-editorial-priority-html.mjs > /tmp/revisao.html
  node scripts/verify-editorial-review-handoff.mjs --json < /tmp/revisao.json
  node scripts/verify-editorial-review-handoff.mjs --markdown < /tmp/revisao.md
  node scripts/verify-editorial-review-handoff.mjs --html < /tmp/revisao.html
  ```
- **R115:** workflow independente sem dependências adicionais, com SHA fixada pelo próprio `GITHUB_SHA` e relatório de falha/sucesso condicionado à execução efetiva.

## Reprodução de testes
```sh
node --check scripts/verify-editorial-review-handoff.mjs
node scripts/check-verify-editorial-review-handoff.mjs
node scripts/check-priority-report-invariants.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

A identidade declarada no recibo é `SYNTHETIC_SOURCE_BOUND_ONLY`; não equivale a revisão pedagógica assinada nem a integridade de um **arquivo arbitrário**. A comparação exige a mesma versão do código e da fonte de origem, e não oferece assinatura externa. Resultado do workflow deve ser consultado na **SHA exata**; não presumir verde durante execução.

## Dependências P0
O aceite das 35 aulas/210 perguntas ainda exige revisão humana autenticada e análise pedagógica. A identidade da empresa, contratos elegíveis ativos e revogação independente continuam bloqueados na [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Nenhum `merge`, `deploy`, `main`, DNS, VPS, SSO, clientes reais ou grants nesta entrega.
