# UNI ERD-R62–R64 — auditoria local dos 35 registros (19/11/2026)

**Escopo:** laboratório isolado do revisor editorial offline (10 cursos / 35 aulas), empilhado sobre a [PR #103](https://github.com/rafhael100/imagine-universidade/pull/103) na SHA `5a55c6b50a3e13df7ca5c4a87ef00ff87bd175c1`. Nenhuma homologação ou publicação está implícita.

## R62 — verificar antes de exportar

O botão **Verificar 35 registros para CSV** percorre cada linha do estado local e executa a mesma rotina `valid()` usada na exportação, sem modificar estados, salvar arquivos ou emitir rede. O texto na região `aria-live=polite` informa a quantidade de registros inválidos e a primeira justificativa, sem renderizar HTML vindo de observações. Um segundo botão permite **Ir à primeira inconsistência**, navegando até a aula correspondente com foco no título.

Um rascunho consistente contém **35 linhas válidas para exportação**, mas **não comprova assinatura, aceitação editorial, revisão independente ou autorização de acesso**.

## R63 — estado temporário e regressões de navegador

Qualquer edição em status, nome, evidência ou observação limpa o resultado anterior e desabilita o salto de inconsistência. A importação também preserva essa propriedade: após mesclagem/substituição efetiva, elimina conclusões antigas; enquanto o arquivo é processado, os botões ficam desabilitados. Os testes Chromium verificam o estado inicial, uma falha reproduzível por revisor/evidência vazios, salto entre cursos com foco acessível, correção e invalidação de relatório obsoleto. A árvore de DOM também é submetida a Axe WCAG 2.1 A/AA.

## R64 — QA independente e verificável

O workflow `.github/workflows/uni-erd-r62-r64-audit-qa.yml` usa somente SHA do checkout, dependências temporárias, Chrome do runner, arquivo `file://` e conteúdo sintético. Verifica os scripts editoriais, a navegação Chromium e todos os **13 gates**. O relatório de auditoria é local, não persistido em API nem incluído em artefatos contendo dados de pessoas.

### Comandos de reprodução (checkout da SHA exata)

```sh
node --check scripts/editorial-review-app.js
node --check scripts/qa-browser-editorial-offline.cjs
node scripts/check-editorial-review-validation.mjs
node scripts/check-editorial-offline-review.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**HOLD_NO_GO:** `ops/release-gates.json` permanece com 13/13 `NOT_VERIFIED`. A [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) ainda requer fonte oficial de contratos ativos, identidade empresarial, revogação e avaliações independentes. Os 35 aceites editoriais humanos autenticados não foram comprovados. `UnavailablePortalAuthority` permanece deny-all. Sem SSO, grant real, contrato, despesas, merge, alteração de `main`, VPS, DNS ou deploy.
