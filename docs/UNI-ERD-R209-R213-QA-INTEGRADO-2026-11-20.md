# UNI ERD-R209–R213 — regressão integrada offline e prova de HOLD_NO_GO

**DRAFT · CI de HEAD exata · dados sintéticos · Portal fail-closed · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

A quantidade de PRs empilhadas e workflows específicos torna importante verificar **as fronteiras juntas** sem depender de uma CI aprovada numa SHA anterior.

- **R209:** executor sem shell e sem rede para toda a cadeia de 35 aulas, relatórios, transcrição TXT, mapa curricular, navegação e revisão.
- **R210:** execução conjunta de **quatro testes PHP de negação Portal**, incluindo indisponibilidade, higiene de resposta, isolamento de empresa e transições de revogação; não são grants reais.
- **R211:** validação dos 13 gates independentes, exigindo estado explícito `NOT_VERIFIED`, evidência nula, questão Portal #886 e `HOLD_NO_GO`.
- **R212:** 11 casos negativos verificam que a suíte não omite um bloqueador, duplica testes, executa caminhos externos ou aceita falsos gates.
- **R213:** workflow exclusivo desta branch, checkout de SHA exata, sem credenciais persistentes; proibição de alteração da árvore e nenhuma publicação operacional.

## Reprodução local sem banco, navegador, fornecedor ou dados de clientes

Node e PHP disponíveis no PATH:

```sh
node scripts/check-integrated-offline-qa-plan.mjs
node scripts/check-integrated-offline-qa.mjs
```

O orquestrador **executa 21 validações**: oito de fonte e handoff editorial, sete de navegação acessível, quatro de Portal e duas de gates. Uma falha ou ausência do PHP encerra o job como falha (não pula a validação). Os testes não concedem permissão real, não verificam contrato ativo nem substituem o aceite pedagógico humano autenticado, teste manual de leitor de tela, homologação privada ou os 13 gates.

O checklist de liberação deve continuar em `HOLD_NO_GO` até haver evidência independente para cada gate. Dependência principal: [rafhael100/imagine-portal#886](https://github.com/rafhael100/imagine-portal/issues/886).

Não autorizado: merge, deploy, main, VPS, DNS, SSO, grant real, custos e dados de clientes.
