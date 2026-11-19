# Universidade Imagine — ERD-R50–R51 · resultados editoriais verificáveis (19/11/2026)

**Somente PR DRAFT; sem deploy/merge.** Base: PR #99, commit `42b94c5acf2e246aede7a28c0df199296d589797`, CI #44633819141 aprovada (2/2) após correção de timeout por `apt`.

## Defeito corrigido (R50)

A busca offline mostrava somente título de curso/aula. Ao filtrar ou procurar uma aula, não se identificava se a revisão estava pendente, requeria ajustes ou possuía apenas alegação de aceite humano. Exibir apenas a seleção visual `aria-current` não indicava estado editorial. Foi adicionada etiqueta por resultado com os três estados textuais:

- `PENDING_HUMAN_REVIEW`: "Situação: Pendente".
- `NEEDS_CHANGES`: "Situação: Requer ajustes".
- `CLAIMED_HUMAN_APPROVED`: "Situação: Aceite declarado (não autenticado)".

O texto deriva somente do estado de sessão validável, não de HTML remoto ou conteúdo livre das notas. Na atualização, a aplicação mantém o botão de resultado no DOM e só altera seu texto quando o estado muda, preservando identidade/foco e evitando substituições redundantes. A busca permanece **100% offline**.

## Regressão R51

O teste de Chromium da página `file://` exercita a troca de pendente para ajustes e aceite declarado, comprova persistência da identidade do botão e retorna a pendente antes de prosseguir com os demais testes. A QA estática verifica os três rótulos e a estratégia de atualização sem reconstrução.

Comandos mínimos no checkout da SHA:
```bash
node --check scripts/editorial-review-app.js
node --check scripts/qa-browser-editorial-offline.cjs
node scripts/check-editorial-lesson-structure.mjs
node scripts/check-editorial-review-validation.mjs
node scripts/check-editorial-offline-review.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
```
O workflow dedicado executa também Chromium/axe com Chrome do runner, sem `apt install-deps`, e preserva evidências somente de QA sintética. Não afirmar passagem antes de conferir conclusão da **SHA exata**.

## Restrições de segurança

O pacote e CSV continuam **não assinados**. Nenhuma declaração de revisão autentica aceite ou autoriza publicação. As 35 aulas ainda exigem aceite editorial humano; o `ops/release-gates.json` deve manter **13/13 `NOT_VERIFIED`** e `HOLD_NO_GO`. Bloqueio P0: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) (serviço ativo oficial, revogação, identidade/permite S2S, signoff). Não inclui SSO, permissões reais, cliente, VPS, DNS, deploy, gastos ou mudança de `main`.

## Complemento R52 — gate fail-closed do Portal

A checagem de `AppServiceProvider` era vulnerável a um falso positivo estático: uma declaração da implementação `UnavailablePortalAuthority` comentada poderia satisfazer um simples `assert.match`. O verificador agora ignora comentários de linha/bloco, exige **uma única** associação ativa e exata de `PortalAuthority` a `UnavailablePortalAuthority` e de `TutorGateway` a `DisabledTutorGateway`, e testa mutações sintéticas para linha comentada, substituição e duplicação/override. A CI inclui `node ops/staging/check-release-gates.mjs` além da política dos 13 gates, sem alterar a configuração real de serviços.

**Limite técnico:** esta inspeção textual detecta as mutações ensaiadas, mas não é parser PHP completo, prova de runtime, revisão AppSec nem consulta a contratos do Portal. O bloqueio `HOLD_NO_GO` permanece obrigatório até as evidências reais da issue #886 e demais gates.