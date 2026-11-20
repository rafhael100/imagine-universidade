# UNI ERD-R59–R61 — navegação de ajustes e foco seguro (19/11/2026)

**Somente laboratório/editor offline.** Esta PR é empilhada sobre [#102](https://github.com/rafhael100/imagine-universidade/pull/102), base `ee3bd42302853d2c4326dd658bb7f10cc1fb4adb`, sem merge, deploy ou dados reais.

## R59 — próxima aula com ajustes no próprio curso

O revisor pode usar **Próxima com ajustes deste curso**, além do controle global já existente. A navegação circular não atravessa cursos e não considera a própria aula como outra pendência. O botão é desabilitado quando não houver outra aula `NEEDS_CHANGES` no curso atual. A mudança conserva foco no título selecionado e apenas consulta estado efêmero no navegador. Nada é gravado automaticamente.

## R60 — preservação de foco após filtros

**Falha reproduzível anterior:** ao aplicar outro filtro por script enquanto um botão de resultado estava focado, o uso de `replaceChildren()` removia o elemento e o navegador podia descartar o foco para o corpo do documento. O mesmo ocorria ao ocultar os resultados. O editor agora captura a identidade do resultado focado antes de alterar o grupo e:

- restaura foco ao resultado correspondente quando ele ainda aparece;
- retorna foco ao campo de busca quando o resultado sai ou o grupo é ocultado;
- mantém o comportamento anterior sem reescrita desnecessária quando o conjunto é idêntico.

Isso não altera a pesquisa, os hashes, status, notas ou a autorização.

## R61 — QA estático, Chromium e acessibilidade

Executar em checkout isolado da SHA candidata:

```sh
node --check scripts/editorial-review-app.js
node --check scripts/qa-browser-editorial-offline.cjs
node scripts/check-editorial-offline-review.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

O workflow `.github/workflows/uni-erd-r59-r61-navigation-focus-qa.yml` também testa navegação local, foco preservado/recuperado em Chromium e WCAG 2.1 A/AA sintético com `file://`; sem hosts externos ou credenciais. Deve ser avaliado **na SHA exata**; execução pendente ou não iniciada não equivale a sucesso.

## HOLD_NO_GO e critérios não satisfeitos

O `ops/release-gates.json` deve continuar com **13/13 NOT_VERIFIED** e `HOLD_NO_GO`. A [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) não fornece ainda a fonte oficial de serviços ativos, identidade empresarial ou revogação homologadas. As 35 aulas carecem de aceite humano autenticado. `UnavailablePortalAuthority` permanece deny-all. Este laboratório não concede grants, nem autentica revisores ou declarações de aceite. Não habilitar SSO, cobrar, publicar, mudar main/VPS/DNS ou expor dados de clientes.
