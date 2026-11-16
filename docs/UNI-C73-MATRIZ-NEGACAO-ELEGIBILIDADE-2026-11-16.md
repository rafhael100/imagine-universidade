# UNI C-73 — matriz de negação da elegibilidade sintética

**16/11/2026 · revisão de código, sem liberação operacional**

A suíte PHPUnit `tests/Unit/MockEntitlementPolicyTest.php` recebeu 11 cenários adicionais de negação: cancelamento do último serviço, trial isolado, revogação, indisponibilidade da autoridade, identidade não autenticada, perda de vínculo, permissão retirada, mudança de empresa, sujeito ausente, empresa ausente e revisão inválida.

Esses casos complementam a matriz do [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). São testes do **mock de domínio**, não da emissão de contratos reais ou assinatura de sessões. Reembolso, cobrança, concorrência e retorno do serviço exigem integração com a fonte oficial do Portal para testes end-to-end.

Comando para o QA de testes autorizado:

```bash
vendor/bin/phpunit --filter MockEntitlementPolicyTest
```

**Evidência:** alterações commitadas em `tests/Unit/MockEntitlementPolicyTest.php`; testes pós-commit ainda não executados/confirmados no GitHub Actions. `UnavailablePortalAuthority` continua vinculado por padrão. Manter `HOLD_NO_GO / NO-MERGE / NO-DEPLOY` até a elegibilidade oficial, revogação independente e revisões necessárias.
