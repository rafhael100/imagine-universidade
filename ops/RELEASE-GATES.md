# UNI C-55 — release gate explícito e auditável

**15/11/2026 · HOLD_NO_GO / NO-MERGE / NO-DEPLOY.**

O arquivo `ops/release-gates.json` deixa claro que a Universidade **não está homologada para receber clientes reais**, mesmo com GitHub Actions verde. A tabela de 13 gates exige evidência verificável e responsável para fonte oficial de serviços ativos, revogação, SSO, permissões editoriais, tenant/recurso, comunicação backend privada, revisões AppSec/DBA/LGPD, aceite pedagógico, staging privado e backup/restauração/rollback real, além de autorização de implantação.

Todos aparecem como `NOT_VERIFIED` **por ausência de evidência aprovada**, não como afirmação de que são inviáveis ou inexistentes. O checker Node inspeciona o manifesto, exige referências quando um gate for marcado `VERIFIED`, mantém `HOLD_NO_GO` e verifica os bindings seguros (`UnavailablePortalAuthority`, `DisabledTutorGateway`). Ele executa em CI, não habilita nada e **não decide automaticamente GO**.

A mudança de um gate para aprovado exige anexar evidência independente e processo humano; não basta alterar JSON. A revisão integrada de código, QA de dados sintéticos e protótipos offline podem avançar em paralelo, mas não substituem os gates operacionais.

P0 principal: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). A preparação segura de inventário está em `ops/staging/`. O registro não contém tokens, segredos, contratos nem PII.
