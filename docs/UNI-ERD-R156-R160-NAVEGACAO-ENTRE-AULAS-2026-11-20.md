# UNI ERD-R156–R160 — sequência de aulas dentro de cada curso

**DRAFT / HOLD_NO_GO / 13/13 NOT_VERIFIED.** Conteúdo sintético não publicado; acesso real não autorizado.

## R156/R157 — experiência do revisor
Cada um dos 35 artigos integra links nativos para a aula anterior e próxima **dentro do mesmo curso e em ordem curricular**, além de retorno ao índice daquele curso. A fila de revisão heurística tem seu próprio anterior/próximo e não determina a sequência pedagógica. As extremidades dos dez cursos não apresentam links inexistentes.

São **25 pares de vizinhança**, equivalentes a 25 links anterior + 25 links próxima, e 35 links para índices de curso, sem scripts, estado salvo, APIs externas ou botão de aceite.

## R158–R160 — QA e segurança
O teste estático compara destinos, títulos e fronteiras com os dados versionados, rejeita seis adulterações e confere 35 textos, 210 perguntas e 13 gates em bloqueio. O workflow dedicado executa esse teste na SHA e branch exatas e em Chrome/axe valida 50 transições de foco, 35 retornos ao curso, viewport 390 px e ausência de HTTP.

```bash
node scripts/check-editorial-course-quicknav.mjs
node scripts/check-editorial-curricular-index.mjs
node scripts/check-editorial-course-sequence.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-sequence.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-sequence.html
node scripts/check-release-gate-policy.mjs
```

Testes automatizados não substituem avaliação manual por leitor de tela nem a **revisão humana autenticada das 35 aulas**. A [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) mantém sem evidência a autoridade de serviços ativos, identidade empresarial, revogação e demais gates. Proibidos merge, deploy, alteração de main, VPS/DNS, SSO, grants reais, custos e dados de clientes.
