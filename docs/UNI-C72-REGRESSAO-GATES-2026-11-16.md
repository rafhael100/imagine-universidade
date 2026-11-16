# UNI C-72 — Regressão automática de integridade dos gates

**16/11/2026 — DRAFT / NO-MERGE / NO-DEPLOY / HOLD_NO_GO**

## Entrega
- `ops/staging/release-gate-policy.mjs`: política reutilizável, exige os 13 nomes exatos, estados e estruturas esperadas e evidências rastreáveis.
- `ops/staging/check-release-gates.mjs`: utiliza a política, mantém verificação dos bindings `UnavailablePortalAuthority` e `DisabledTutorGateway` e bloqueia identidade pública improvisada.
- `scripts/check-release-gate-policy.mjs`: 15 cenários determinísticos, incluindo gate removido, falso gate, estado não reconhecido, evidência falsificada, alteração de GO e tentativa de aprovar a implantação sem processo independente.
- `.github/workflows/university-manual-qa.yml` e `scripts/check-local.sh`: incluem a nova bateria quando QA é acionado nas condições já autorizadas.

## Como executar
```bash
node ops/staging/check-release-gates.mjs
node scripts/check-release-gate-policy.mjs
```

Os testes validam integridade **estrutural**, não a veracidade das evidências. Um link válido não equivale a uma auditoria aprovada. O estado operacional permanece bloqueado por fonte oficial de serviços, revogação, SSO, permissão editorial, isolamento e gates humanos.

## Evidência nesta entrega
Commits registrados no GitHub; ao consultar o último commit, **nenhum workflow ou combined status foi retornado**. Por isso o resultado dos novos cenários **não pode ser declarado verde** até execução real em runner autorizado. O GitHub remoto não pôde ser clonado no sandbox de inspeção porque não houve resolução DNS de github.com; nenhum teste real de runtime foi simulado como aprovado.

## Dependência que limita a evolução
[Portal issue #886](https://github.com/rafhael100/imagine-portal/issues/886) continua registrando fonte de serviço ativo e revogação como não homologadas. Contrato de identidade, concessão, revogação e elegibilidade exige evidências oficiais antes de qualquer provider allow. Manter `HOLD_NO_GO` até AppSec/DBA/LGPD, backups/rollback e aceite editorial.
