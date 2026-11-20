# UNI ERD-R88–R90 — regressão real do default deny-all Portal (20/11/2026)

**DRAFT · CHECKS SINTÉTICOS SEM SSO · HOLD_NO_GO.**

## Entregas

- **R88:** `scripts/check-portal-default-deny.php` carrega as classes PHP reais `PortalAccessGate` e `UnavailablePortalAuthority`, sem Composer, banco, tokens nem servidor. Confirma que VIEW e MANAGE negam credenciais e empresas sintéticas, e que contextos inválidos são recusados.
- **R89:** o mesmo script inspeciona o binding efetivo em `AppServiceProvider.php`, removendo comentários e literais de string via tokens PHP para não confundir documentação com código. Exige um único binding `PortalAuthority => UnavailablePortalAuthority`, `PortalAccessGate` ligado a essa autoridade e tutor desativado. Seis mutações negativas incluem binding comentado, substituído, duplicado e sobrescrito.
- **R90:** workflow isolado em branch DRAFT, `contents: read`, checkout na SHA exata, checagem sintática PHP, execução real do teste de negação e auditoria dos 13 gates.

```bash
php -l scripts/check-portal-default-deny.php
php scripts/check-portal-default-deny.php
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**Limite:** estes testes asseguram a configuração de *negação por padrão* e detectam determinadas alterações indevidas no provedor. Não provam homologação de um adaptador real, revogação independente, segurança de transporte, SSO ou política de serviços ativos. A inspeção de binding não é análise estática PHP completa nem substitui AppSec. Toda mudança futura de binding exige revisão e autorização própria.

A issue [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) permanece o bloqueio da autoridade oficial de contratos, identidade e revogação. `ops/release-gates.json` continua **13/13 NOT_VERIFIED, HOLD_NO_GO**; as 35 aulas não possuem aceite humano autenticado. Não há grants, deploy, gastos, dados reais, VPS, DNS, merge nem alteração da `main`.
