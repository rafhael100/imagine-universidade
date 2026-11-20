# UNI ERD-R56–R58 — status de cada aula e navegação local (19/11/2026)

**Candidato exclusivamente offline, não aprovado, sem deploy.** PR empilhada sobre #101, HEAD de base `422f51f680790b330dba867b16005b2a15732086`.

## R56 — seletor das aulas informativo e acessível

Cada opção nativa de aula apresenta sua situação atual: **Pendente**, **Requer ajustes** ou **Aceite declarado (não autenticado)**. O rótulo muda in-place quando o status muda; alterações apenas nas observações não reescrevem o texto das opções. O HTML e o currículo continuam inteiramente locais; não há script remoto, persistência, backend ou aprovação implícita.

## R57 — próxima pendente dentro do curso

O novo controle **Próxima pendente deste curso** busca apenas outras aulas da turma atualmente selecionada, em ordem circular. Se não existe outra pendente nesse curso, o botão permanece desabilitado; o controle já existente **Próxima pendente** continua navegando pelo acervo completo. A operação não altera dados editoriais, apenas move o foco ao título da aula escolhida.

## R58 — QA reproduzível e gates

- `node scripts/check-editorial-offline-review.mjs`: valida presença dos novos controles, rótulos e preservação do acervo.
- `scripts/qa-browser-editorial-offline.cjs`: cobre opção pendente, atualização do status sem destruir DOM, ausência de mudanças em edição de nota, salto restrito ao curso, desabilitação ao esgotar as pendentes e preservação da navegação global.
- `.github/workflows/uni-erd-r56-r58-lesson-progress-qa.yml`: CI de escopo isolado, com path filter **correto para o próprio arquivo do workflow**, testes de conteúdo, integridade, segurança, Chromium/axe e `HOLD_NO_GO`. **Não interpretar CI pendente como aprovação.**

## Limitações e proibições

As 35 aulas continuam **sem aceite editorial humano autenticado**. Nenhuma alteração no contrato ou grants do Portal; `UnavailablePortalAuthority` mantém bloqueio por padrão. Os 13 gates do `ops/release-gates.json` permanecem `NOT_VERIFIED`, decisão `HOLD_NO_GO` e a issue do Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) aberta. É obrigatório homologar a fonte oficial de contrato ativo, revogação, identidade empresarial, segurança, LGPD e restore reais antes de qualquer acesso de cliente. Não há SSO, merge, deploy, produção, DNS, VPS, dados reais ou custos.
