# UNI ERD-R146–R150 — acesso direto aos 10 cursos no HTML offline

**DRAFT / HOLD_NO_GO / 13 gates NOT_VERIFIED — sem cliente real, SSO, grants ou publicação.**

## Mudança funcional

O leitor de texto integral da PR #126 possui 35 aulas em uma fila de prioridade, e não na ordem curricular. Acrescentei uma navegação nativa com **10 atalhos, um para cada curso**. Cada atalho informa o nome e a quantidade de aulas do curso; seu destino é a **primeira aula desse curso na fila de prioridade**, identificada pelo ID curricular. O índice principal de 35 aulas e os links anterior/próximo existentes continuam intactos.

Não há JavaScript no HTML, persistência de marcação, botão de aceite, chamada de API, autenticação fingida ou concessão de acesso.

## QA reproduzível

```bash
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-editorial-course-quicknav.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-course-index.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-course-index.html
node scripts/check-release-gate-policy.mjs
```

O workflow `uni-erd-r146-r150-course-quicknav-qa.yml` adiciona Chromium real e axe WCAG 2.1 automatizado na SHA da branch. Ele testa 10 saltos por Enter, os 35 corpos de texto, 210 perguntas de revisão, 390 px e ausência de requisições externas. Não equivale a validação manual com leitor de tela.

**Restrições:** nenhuma aula tem aceite humano autenticado; o Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) ainda não prova serviço ativo, revogação e identidade empresarial. A PR deve permanecer DRAFT; proibidos merge, deploy, produção, VPS/DNS e SSO.
