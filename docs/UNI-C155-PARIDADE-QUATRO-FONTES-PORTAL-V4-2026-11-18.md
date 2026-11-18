# UNI C-155 — Paridade adversarial com quatro fontes do Portal V4

**Revisão de contrato sintética, sem autenticação/SSO operacional.**

## Dependência existente

A Universidade já executa um verificador `scripts/check-portal-university-contract.php`
sobre o checkout real e **fixado** da candidata Portal V4.2
`8f469b7079467098337568178637cc989420a102`. O checkout é somente leitura;
não há Composer, HTTP nem chamadas a provedor externo nesse teste.

Até C154 a paridade cobria vocabulário e tamanhos de IDs, default deny-all,
indisponibilidade geral e proibição de transformar um envelope assinado em grant,
mas não distinguia a ausência individual das quatro fontes comerciais.

## Novos cenários de regressão

A C155 usa as classes **reais** do Portal V4, com autoridades estritamente
sintéticas injetadas somente na suíte de teste:

- Um contrato Onepage `active`, revisão de revogação igual, SKU e política
  hipoteticamente compatíveis e cobertura recorrente coerente produzem apenas
  `candidate_pending_official_authority`. Mesmo nesse caso,
  `mayIssuePortalGrant()` e `provesPaidContract()` continuam **false**.
- Falha isolada de cada uma das quatro fontes: contratos, revisão/revogação,
  política de SKUs e cobertura. Todas retornam `source_unavailable` sem grant.
- Cobertura derivada de instalação isolada, webhook isolado, carência não
  aprovada, revisões divergentes, tenant trocado, SKU não autorizado ou
  ausência da cobertura de serviço ativo: todas recusadas.
- Portfólio explicitamente vazio retorna `contract_no_eligible_service` e não
  representa cliente com assinatura ativa.

Os 4 pontos de falha são independentes; as verificações confirmam também
que a resposta diagnóstica nunca vira prova de pagamento. As classes de
produção da Universidade permanecem `UnavailablePortalAuthority`.

## Execução e critério de aceite

O job de CI `portal-contract-parity` deverá executar o script contra o
mesmo checkout fixado, sem modificar o Portal, a VPS, o banco ou a main.
Os novos cenários **não** validam procedência oficial da fonte, identidade
com MFA, titularidade do serviço, revogação distribuída ou cobrança recorrente
real. Esses requisitos permanecem no Portal issue #886 e nos 13 gates de
`ops/release-gates.json`.

Sem merge, deploy, DNS, assinatura, custos ou criação de acesso real.
