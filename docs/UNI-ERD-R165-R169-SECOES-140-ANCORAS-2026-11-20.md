# ERD-R165–R169 — quatro seções por aula, 140 âncoras acessíveis

> DRAFT / laboratório sintético offline / HOLD_NO_GO. **13/13 NOT_VERIFIED** em `ops/release-gates.json`. Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) continua bloqueando acesso real. Nenhuma publicação ou aprovação pedagógica está implícita.

## Entregas reproduzíveis

- **R165:** na leitura integral, cada uma das 35 aulas agora tem índice de quatro seções, vinculado ao texto versionado: contexto, EXEMPLO FICTÍCIO, APLICAÇÃO OPCIONAL e CUIDADO IMPORTANTE. São **140 links**, **140 h4 com identificadores únicos** e foco programático sem paradas extras no Tab. A ordem é curricular dentro da aula; a fila editorial continua separada.
- **R166:** o validador `scripts/check-editorial-section-deeplinks.mjs` confere os 140 pares link/título, correspondência ao texto original, 35 índices, escopo exclusivamente offline, integridade do HTML e **9 negativas** (hash, alteração de âncora, foco e rótulos, alegação de GO e seções modificadas).
- **R167:** o Chrome percorre **140 destinos por Enter**, verifica o heading efetivamente focado, limite móvel, axe-core WCAG 2.0/2.1 A/AA sem erros graves, ausência de scripts e ausência de rede.
- **R168:** o foco de headings ganhou contorno visível sem JavaScript ou CSS externo; o documento mantém CSP restritiva e verificação byte a byte.
- **R169:** CI específica com `GITHUB_SHA` exata, checkout sem persistir credenciais, branch isolada e checagem dos 13 gates.

## Reprodução local sem cliente, Portal nem segredos

```bash
node --check scripts/render-editorial-fulltext-html.mjs
node --check scripts/check-editorial-section-deeplinks.mjs
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-editorial-curricular-index.mjs
node scripts/check-editorial-course-sequence.mjs
node scripts/check-editorial-course-return-focus.mjs
node scripts/check-editorial-section-deeplinks.mjs
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-sections-r165.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-sections-r165.html
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

Chrome é deliberadamente restrito à CI sintética, com artefato em `RUNNER_TEMP`. Um workflow verde na SHA exata demonstra **somente** estes testes; não significa aceite humano, revisão independente de acessibilidade com tecnologia assistiva, deploy ou autorização de acesso.

## Limites e dependências

Os 35 textos e 210 itens da rubrica ainda precisam de aceite humano autenticado e rastreado pelo SHA. Não há contrato/serviço ativo comprovado, identidade/SSO empresarial validada nem revogação independente homologada. O contrato do Portal permanece **deny-all**. Esta PR não toca `main`, VPS, DNS, produção, segredos, clientes ou grant real.
