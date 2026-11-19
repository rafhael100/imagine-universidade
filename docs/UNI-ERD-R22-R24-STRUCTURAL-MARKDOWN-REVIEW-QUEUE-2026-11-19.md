# UNI ERD-R22–R24 — Pré-validação, Markdown passivo e fila humana das 35 aulas

**Data:** 19/11/2026 · **Escopo:** somente branch de revisão (DRAFT). **Decisão:** `HOLD_NO_GO`.

## Problemas encontrados e corrigidos

1. **R22 — Fonte válida para o auditor, mas não obrigatoriamente para o gerador.** O comando de gerar pacote usava `safeBody` com um limite global de palavras e ordem dos títulos. Era possível reduzir a seção final de uma aula a “Breve.” sem interromper o pacote, porque o restante da aula ainda continha mais de 95 palavras. A auditoria estrutural independente recusava essa mesma aula. O gerador agora exige `auditEditorialLessonStructure(payload)` **antes da primeira gravação**. Um teste na última aula prova que o diretório permanece vazio se uma seção pedagógica não tem o mínimo previsto.
2. **R23 — Conteúdo ativo em um Markdown offline.** A segurança anterior bloqueava `<script>` e `javascript:`, mas não um elemento `<img src="https://...">` ou imagens/links Markdown. Um visualizador de Markdown pode carregar recursos externos ou criar links enganosos. `safeLine` e `safeBody` agora recusam tags HTML, autolinks e links/imagens Markdown, inclusive definições por referência, sem alterar o acervo original. Testes positivos cobrem o português original e os negativos injetam cinco formatos na última aula. A decisão de aceitar links didáticos no futuro precisará de política e sanitização específica.
3. **R24 — Revisão humana priorizável, sem aprovação simulada.** `scripts/build-editorial-review-queue.mjs` produz, apenas em stdout, um checklist determinístico de 35 aulas com IDs/hashes imutáveis. Primeiro vêm as 24 pistas de redação repetitiva identificadas pela auditoria, seguidas das outras 11 aulas. Trata-se de **triagem**, não de juízo de qualidade ou aceite. `scripts/check-editorial-review-queue.mjs` exige 35 linhas e hashes, 24 pistas, 13 gates preservados pelo pipeline e rejeita declarações automáticas de aceite.

## Reprodução em ambiente sintético

```bash
node --check scripts/build-editorial-review-pack.mjs
node --check scripts/editorial-text-safety.mjs
node --check scripts/build-editorial-review-queue.mjs
node scripts/check-editorial-lesson-structure.mjs
node scripts/check-editorial-text-safety.mjs
node scripts/check-editorial-pack-preflight.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-editorial-review-queue.mjs
node scripts/check-editorial-review-validation.mjs
node scripts/check-release-gate-policy.mjs
node scripts/build-editorial-review-queue.mjs > /tmp/universidade-revisao-35.md
```

A fila deve permanecer fora do repositório de produção; a saída contém apenas conteúdo curricular sintético. Nenhum dado de clientes, segredo, identidade de revisor ou prova operacional é incluído.

## Limites de evidência e próximos requisitos

- **35/35 aulas continuam pendentes de aceite humano.** As 24 pistas estilísticas são hipóteses para leitura individual, não falhas automaticamente comprovadas.
- **13/13 gates permanecem `NOT_VERIFIED`.** A [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) depende de fonte oficial autenticada de contratos elegíveis, revogação independente e identidade da empresa; o padrão é sempre negar.
- Nenhum merge, mudança da main, SSO real, grant de clientes, deploy, VPS, DNS, pagamento ou fornecedor novo. Não marcar a PR como pronta para produção só porque o CI passou.
- Antes de integrar: revisar diferenças e CI da **SHA exata** e confirmar que branches #85/#90/#91/#92/#93 não foram modificadas por esta execução.

**Nota de QA:** o primeiro CI R23 na SHA `67e1172` falhou por um teste que esperava rejeição de uma definição Markdown quando posicionada no meio do título; como Markdown só a interpreta no início da linha, ajustou-se a reprodução para o início da linha. O check da SHA `8a093d4` foi aprovado. Isso não é evidência de qualidade pedagógica.
