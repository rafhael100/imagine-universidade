# UNI ERD-R151–R155 — índice curricular acessível das 35 aulas

**DRAFT · HOLD_NO_GO · 13/13 NOT_VERIFIED · somente conteúdo sintético.**

## R151/R152 — navegação pedagógica
O HTML offline já possui fila heurística e 10 atalhos para cursos. Agora também apresenta **10 grupos com as 35 aulas em ordem curricular**, mantendo as referências da fila priorizada. Cada link usa o ID da aula proveniente da fonte versionada, mostra sua posição no curso e na fila e conduz ao mesmo artigo integral, focável por teclado. Não altera a ordem de triagem nem marca conclusão.

## R153 — integridade
`scripts/check-editorial-curricular-index.mjs` compara os 35 links com os 35 IDs curriculares e os 10 cursos da fonte, confere a posição de fila, título escapado, unicidade e existência dos destinos. Seis mutações negativas são rejeitadas pelo verificador byte a byte. As verificações anteriores de conteúdo e atalhos permanecem.

## R154/R155 — QA reproduzível
O workflow `.github/workflows/uni-erd-r151-r155-curricular-index-qa.yml` exige branch e SHA exatas e executa QA estático, gates e Chromium real/axe WCAG 2.1 com 35 navegações por Enter, viewport de 390 px e sem requisição HTTP remota.

```bash
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-editorial-course-quicknav.mjs
node scripts/check-editorial-curricular-index.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-curricular.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-curricular.html
node scripts/check-release-gate-policy.mjs
```

QA automatizado não equivale a aceite editorial humano nem avaliação manual por leitor de tela. Os **210 critérios de revisão humana das 35 aulas continuam pendentes**, assim como a autoridade oficial de serviços ativos/revogação/identidade empresarial na [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Não há SSO, grants, produção, deploy, VPS, DNS, merge, cobrança nem clientes reais.
