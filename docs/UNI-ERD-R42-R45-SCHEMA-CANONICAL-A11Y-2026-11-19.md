# UNI ERD-R42–R45 — metadados inequívocos e acesso por teclado (19/11/2026)

**Status:** revisão técnica DRAFT; nenhum aceite humano, autenticação, operação ou publicação.

## Falha reproduzível e correções

- **R42 — fail-closed do verificador `--dir`:** antes, um terceiro podia incluir `release_decision: GO` ou `editorial_signoff` no `manifesto-revisao.json`, recalcular os checksums não assinados e obter validação positiva em `--dir`. O `--source` recusava, mas nem todo revisor o utiliza. Agora a lista fechada de campos na raiz, em cada curso e em cada aula recusa campos de aprovação/publicação não previstos.
- **R43 — JSON canônico do manifesto:** recusa chaves JSON duplicadas, BOM, bytes UTF-8 inválidos e diferenças de serialização. Assim um leitor que respeita o primeiro valor não interpreta `"publishable": true` enquanto outro aceita o último `false`.
- **R44 — selo canônico:** o próprio `INTEGRIDADE-PACOTE.json` também recusa chaves duplicadas de `release_decision`, BOM e codificação não canônica. A comparação dos 15 SHA-256 continua obrigatória.
- **R45 — navegação acessível:** `revisao-navegavel.html` oferece link de salto visível ao receber foco por teclado, apontando para o cabeçalho de aula `tabindex=-1`; teste estático verifica âncora e CSS.

## QA sintético

`node scripts/check-editorial-package-integrity.mjs` comprova 54 cenários negativos, incluindo JSON rehashado com aprovação falsa, duplicação de membros e selo ambíguo. `node scripts/check-editorial-offline-review.mjs` verifica estrutura offline, 35 aulas, hashes CSP e salto de navegação. Workflow isolado `uni-erd-r42-r45-canonical-a11y-qa.yml` valida novamente na SHA exata (resultado só após execução).

`--dir` e `--source` **não são assinatura nem comprovação de autoria**, e a UI offline não autentica identidade nem aceite. A verificação do código não substitui revisão humana das 35 aulas. O Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) segue sem fonte oficial de serviços ativos, revogação ou identidade empresarial; os 13 gates do `ops/release-gates.json` permanecem `NOT_VERIFIED` / `HOLD_NO_GO`.

Sem merge, deploy, main, VPS, DNS, custos, dados de clientes, grants ou SSO real.
