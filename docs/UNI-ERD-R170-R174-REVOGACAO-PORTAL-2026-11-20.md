# ERD-R170–R174 — transições sintéticas de elegibilidade Portal

**Somente testes, documentação e CI.** O código de produção continua usando `UnavailablePortalAuthority`; nada concede acesso. Os **13 gates permanecem NOT_VERIFIED** e o lançamento em `HOLD_NO_GO`. Bloqueador principal: [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

## Entregas

- **R170:** prova independente de que uma resposta sintética aceita anteriormente **não pode permanecer válida** após cancelamento do último serviço, revogação, suspensão, indisponibilidade ou exceção, porque cada solicitação consulta a autoridade novamente.
- **R171:** reativação exige uma nova verificação; ausência de permissão, empresa incorreta, expiração, revisão zero e timeout continuam negados.
- **R172:** quatro contextos inválidos são barrados **antes** da chamada ao provedor; VIEW/MANAGE com `UnavailablePortalAuthority` negam sempre. O teste verifica contagem real de chamadas, não apenas motivo de negação.
- **R173:** regressões do provedor padrão, sanitização da razão de recusa e negativas anteriores rodam junto com o novo teste PHP.
- **R174:** workflow de CI na SHA exata, branch isolada e verificação da lista de arquivos permitidos; a PR não pode passar se modificar código de produção, `main`, `ops/release-gates.json` ou `app/Providers/AppServiceProvider.php`.

## Reproduzir

```bash
php -l scripts/check-portal-revocation-transitions.php
php scripts/check-portal-revocation-transitions.php
php scripts/check-portal-authority-negative.php
php scripts/check-portal-deny-reason-hygiene.php
php scripts/check-portal-default-deny.php
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**Atenção:** um candidato `PortalGrant::allow()` criado *exclusivamente em fixture* não demonstra assinatura, validade de contrato nem fonte oficial. O teste não comprova monotonicidade de revisões na autoridade real, reconciliação de cobranças ou identificação empresarial. Isso continua dependendo de implementação e homologação autênticas no Portal #886, com revisão de segurança, LGPD, DBA, backup/rollback e aceite humano das 35 aulas.

A PR foi planejada como extensão isolada sobre a PR #131; sem merge, deploy, VPS, DNS, cobrança, SSO, dados de clientes ou acesso real.
