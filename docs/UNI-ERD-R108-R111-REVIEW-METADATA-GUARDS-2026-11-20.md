# UNI ERD-R108–R111 — integridade do relatório de triagem (20/11/2026)

**Estado:** revisão em PR DRAFT; sem publicação, autenticação editorial, grants, SSO ou clientes reais. **HOLD_NO_GO, 13/13 NOT_VERIFIED.**

## Problema reproduzido
O validador de relatório de prioridade validava campos conhecidos, mas tolerava outros campos arbitrários em nível de relatório e aula. Ex.: um registro poderia simultaneamente declarar `grants_issued: 0` e adicionar `mayIssuePortalGrant: true`, ou anexar um `editorialApproval: {signed:true}` a uma aula sem que o contrato rejeitasse o payload contraditório. Além disso, títulos e códigos de risco podiam conter caracteres Unicode de formatação invisíveis (incluindo controles bidirecionais), confundindo a leitura humana do documento passivo.

## Alterações
- **R108:** contrato exato de campos do relatório de 35 aulas e de cada linha; chaves faltantes ou extras são erro.
- **R109:** rejeição dos caracteres Unicode das categorias Cc e Cf em rótulos de curso/aula, exceto quebras de linha já normalizadas/escapadas no Markdown e HTML; lista de códigos heurísticos limitada aos quatro sinais conhecidos, sem duplicação.
- **R110:** testes negativos contra metadados de falso aceite, falsos grants, controles bidirecionais, títulos com caractere invisível, tabulação invisível (novas linhas seguem escapadas pelos renderizadores legados), riscos inexistentes e repetidos. Executar tanto HTML quanto Markdown e conferir que recusam o mesmo payload.
- **R111:** workflow isolado com checkout da SHA exata, Node sem instalação de terceiros e verificações do manifesto de 13 gates.

## Reproduzir (somente fonte sintética versionada)
```sh
node --check scripts/validate-editorial-priority-report.mjs
node --check scripts/check-priority-report-invariants.mjs
node scripts/check-priority-report-invariants.mjs
node scripts/check-editorial-review-priority.mjs
node scripts/check-editorial-priority-html.mjs
node scripts/check-verify-editorial-priority-html.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**Critérios de QA:** relatório normal das 35 aulas aceito sem mudança de conteúdo; 23 mutações negativas rejeitadas; HTML e Markdown continuam passivos e não podem transformar um rascunho em aceite. A aprovação da CI só vale para a SHA final em que for executada; execução pendente não constitui sucesso.

## Dependências externas e limites
- As 35 aulas continuam exigindo revisão humana autenticada dos 210 pontos.
- A fonte oficial de serviços ativos, revogação e identidade continua bloqueada pela [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).
- Não mexer em `main`, VPS, DNS, produção ou configuração de autorização real. O relatório é apenas uma ferramenta de triagem, sem prerrogativas de acesso.
