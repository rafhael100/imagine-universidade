# UNI C161 — Matriz de ciclo de vida do benefício Universidade

O validador de paridade entre a Universidade e a candidata Portal V4
passa a executar a lógica real do Portal (checkout fixado) com snapshots
**inteiramente sintéticos** para simular:

- cancelamento, suspensão, preparação, trial, trial-only ou serviço
  inelegível, todos sem candidatos qualificados;
- dois serviços, com cancelamento de um deles e manutenção de outro;
- cancelamento do **último** serviço elegível, que deve zerar candidatos;
- reativação com revisão nova e cobertura coerente, ainda sem emitir grant;
- tentativa de reutilizar revisão antiga depois da reativação;
- revogação explícita de serviço ativo na fonte independente.

Em todos os cenários, nenhum `PortalGrant` é criado:
`UniversityCommercialEligibilityResult::mayIssuePortalGrant()` continua falso,
e a fonte oficial real (Portal issue #886) ainda está indisponível.

O teste executa `scripts/check-portal-university-contract.php` no job
`portal-contract-parity` com o contrato V4.2 fixado. Não altera a fonte
canônica, os 13 gates, autenticação, dados, assinatura, servidor ou
implantação. **DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY.**
