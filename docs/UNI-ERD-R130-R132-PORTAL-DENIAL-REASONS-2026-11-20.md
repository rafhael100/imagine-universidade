# Imagine Universidade — ERD R130–R132: negações Portal legíveis e seguras

**DRAFT · HOLD_NO_GO · 20/11/2026.** Correção de fronteira exclusivamente local. Não existe autoridade Portal homologada; a implementação padrão continua `UnavailablePortalAuthority`.

## Falha reproduzível e correção

Antes, `PortalAccessGate::authorize()` propagava para o consumidor o `reasonCode` bruto devolvido por uma autoridade externa que **negasse** acesso. Esse texto podia conter quebras de linha, HTML, Unicode inesperado ou mensagens de diagnóstico, contaminando logs ou mensagens de UI. A negação não virava autorização, mas a higienização era insuficiente.

- **R130:** permitir somente códigos canônicos `[a-z][a-z0-9_]{0,63}`; respostas malformadas ou com aparência de sucesso (`authorized`, `allow`, `allowed`, `success`, `ok`) viram `access_denied`, sempre negando acesso. Motivos sintéticos já usados (`revoked`, `last_service_cancelled`, `editor_revoked` etc.) continuam aceitos.
- **R131:** regressões PHP sem Composer usando apenas autoridade sintética, incluindo injeção CRLF, NUL, bytes inválidos, HTML, IDs indevidos, expiração e candidato positivo apenas em laboratório.
- **R132:** workflow de QA na SHA exata; repete a suíte anterior de negativas, o provider deny-all e a integridade dos 13 gates.

### Reproduzir no checkout da PR

```sh
php -l app/Domain/Access/PortalAccessGate.php
php scripts/check-portal-deny-reason-hygiene.php
php scripts/check-portal-authority-negative.php
php scripts/check-portal-default-deny.php
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

O teste de formato não comprova que todo código semanticamente válido é não sensível; adaptadores reais devem usar uma enumeração auditada de razões, sem mensagens de exceção. Não autorizar SSO, empresa, assinatura, grants, merge ou deploy com base nesta entrega. A issue Portal #886, o aceite humano das 35 aulas e os **13/13 gates NOT_VERIFIED** continuam bloqueadores independentes.
