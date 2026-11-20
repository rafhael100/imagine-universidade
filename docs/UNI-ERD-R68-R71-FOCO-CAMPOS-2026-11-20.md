# UNI ERD-R68–R71 — acesso direto ao campo inválido e QA de teclado (20/11/2026)

**Revisão DRAFT, offline/sintética; não é aceite pedagógico, autorização de acesso nem publicação.**

## Escopo e motivação

A lista de erros da revisão das 35 aulas (R65–R67) saltava ao título da aula. Era necessário procurar manualmente qual campo causara o bloqueio de exportação. No navegador com teclado, `Enter` no erro deixava foco no título em vez do campo corrigível — um desvio de usabilidade reproduzível na fixture anterior.

- **R68 — Campo exato:** a auditoria seleciona a aula e posiciona o foco em `status`, `reviewer`, `evidence` ou `notes` conforme a primeira validação que falhou; destaca `aria-invalid=true`, explica o motivo no aviso e limpa a indicação após edição, importação ou navegação. Resultado desconectado do rascunho não pode ser reutilizado.
- **R69 — Teclado:** na lista de inconsistências, `ArrowUp`/`ArrowDown` andam pelos botões, `Home`/`End` vão para o início/fim e `Escape` retorna ao comando de auditoria. `Tab`, `Shift+Tab`, `Enter` e `Space` continuam nativos.
- **R70 — Qualidade:** regressões `file://` em Chromium exercitam dois erros de cursos/aulas distintos, foco em campo, remoção de `aria-invalid` após alteração, lista invalidada, todos os atalhos e análise WCAG 2.1 A/AA do estado sinalizado. Teste estático confere os vínculos no HTML gerado, sem transformar a fonte em um mock.
- **R71 — Cobertura negativa:** três casos adicionais: notas que iniciam como fórmula CSV, revisor indevido em aula pendente e evidência indevida em aula pendente. A navegação direciona ao campo correto sem alterar a decisão de release.

## Reprodução e testes locais (somente offline)

```bash
node --check scripts/editorial-review-app.js
node --check scripts/qa-browser-editorial-offline.cjs
node scripts/check-editorial-offline-review.mjs
node scripts/check-editorial-review-validation.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

Em ambiente isolado com Playwright `1.58.2`, `@axe-core/playwright@4.10.2` e Chrome disponível, o workflow `uni-erd-r68-r71-audit-focus-qa.yml` também executa o pacote `qa-browser-editorial-offline.cjs` contra o HTML gerado em `file://`. O workflow roda somente nessa branch, sem segredos, sem dispositivos reais, sem acesso a cliente e sem dependência de servidor.

## Critérios de aceite técnico

1. Ao usar `Ir à primeira inconsistência` ou um botão da lista, o controle inválido deve receber foco; um problema nas observações não deve enviar o usuário ao campo revisor.
2. A edição deve invalidar todos os resultados auditados e remover `aria-invalid`, sem deixar um botão de erro obsoleto capaz de apontar para uma aula alterada.
3. Nenhum campo do CSV deve ser corrigido automaticamente; revisão e aceite humano continuam tarefas distintas.
4. O fluxo não chama rede, não escreve servidor, não armazena automaticamente no navegador e não emite grants.

## Gates de integração

`ops/release-gates.json` continua `HOLD_NO_GO`, com **13/13 `NOT_VERIFIED`**. A issue [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) não comprova a autoridade oficial de contratos/serviços elegíveis ativos, revogação independente, identidade empresarial/MFA e autorização de equipe editorial. `UnavailablePortalAuthority` permanece como padrão de negação. As 35 aulas continuam sem aceite editorial humano autenticado.

**Sem merge, deploy, main, VPS, DNS, SSO, custos, grant real ou dados de cliente.** O resultado de CI deve ser conferido na **SHA exata** após os últimos commits; não presumir êxito enquanto estiver pendente.
