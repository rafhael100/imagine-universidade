# ERD-R175–R179 — retorno acessível aos índices das 35 aulas

**DRAFT · ambiente sintético offline · HOLD_NO_GO · 13/13 NOT_VERIFIED.** Nenhum serviço real do Portal, SSO, acesso de cliente ou aceite pedagógico.

## Trabalho

- **R175:** cada uma das quatro seções de cada aula ganhou link nativo de retorno ao índice da própria aula (**140 links**). Há **35 títulos h3 focáveis** com `tabindex=-1`, sem paradas extras de Tab.
- **R176:** 140 links devem referenciar exclusivamente os 35 títulos corretos, com cinco mutações negadas; verificador byte a byte e indicadores `HOLD_NO_GO` preservados.
- **R177:** Chromium exercita **140 retornos com Enter e mudança efetiva de foco**, mobile e axe WCAG A/AA; sem rede, script ou dados reais.
- **R178:** CSS apresenta foco visível ao retornar ao h3; o teste anterior de remoção de título foi atualizado para continuar exercitando uma mutação real, sem falso verde.
- **R179:** CI isolada por branch e SHA exata, incluindo regressões herdadas, segurança do pacote e 13 gates.

## Como reproduzir

```bash
node --check scripts/render-editorial-fulltext-html.mjs
node --check scripts/check-editorial-fulltext-html.mjs
node --check scripts/check-editorial-section-returns.mjs
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-editorial-section-deeplinks.mjs
node scripts/check-editorial-section-returns.mjs
node scripts/check-editorial-course-return-focus.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-r175.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-r175.html
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

O teste Chrome fica restrito ao workflow com artefato local em `RUNNER_TEMP` e dependências efêmeras. Não substitui revisão manual com leitor de tela.

A verificação de navegação não altera `ops/release-gates.json`. A fonte oficial de serviços Imagine ativos, a revogação independente, identidade empresarial, revisão AppSec/DBA/LGPD, recuperação real e aceite humano das 35 aulas dependem da [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) e dos demais gates. Nenhum merge, deploy, VPS, DNS, custos, SSO ou grants reais.
