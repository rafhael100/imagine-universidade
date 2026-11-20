# UNI ERD-R161–R164 — retorno acessível aos índices por curso

**DRAFT / HOLD_NO_GO / 13/13 NOT_VERIFIED.**

## Falha reproduzível
O atalho de volta à seção do curso em R156–R160 alterava o fragmento URL, mas o título de destino não tinha `tabindex=-1`. Isso não garantia retorno efetivo do foco de teclado, especialmente para usuários de leitor de tela.

## Correção
Os dez títulos h3 dos cursos no índice recebem `tabindex="-1"`, sem adicionar paradas ao fluxo de Tab. Agora o destino corresponde ao fragmento, aceita foco via Enter e continua nomeando sua seção por `aria-labelledby`. O verificador estático anterior foi ajustado para validar explicitamente esse contrato. O conteúdo dos 35 rascunhos e as 210 perguntas permanecem byte-bound e sem aceite.

## Evidências
`scripts/check-editorial-course-return-focus.mjs` valida dez títulos e 35 retornos, rejeitando quatro alterações indevidas. O workflow dedicado usa SHA exata e Chromium para navegar pelos 35 retornos e confirmar **`document.activeElement.id`**, além de axe WCAG 2.1, viewport móvel, zero HTTP e os 13 gates.

```bash
node scripts/check-editorial-curricular-index.mjs
node scripts/check-editorial-course-sequence.mjs
node scripts/check-editorial-course-return-focus.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-course-focus.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-course-focus.html
node scripts/check-release-gate-policy.mjs
```

Este ajuste não autentica revisores e não concede permissões. A decisão depende de aceites humanos, avaliações manuais e [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Sem merge/deploy, main, VPS, DNS, SSO, grants, clientes reais ou novos custos.
