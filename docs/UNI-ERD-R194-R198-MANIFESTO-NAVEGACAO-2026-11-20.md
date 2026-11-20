# ERD-R194–R198 — manifesto de navegação verificável do leitor offline

**DRAFT · 10 cursos, 35 aulas e 210 perguntas pedagógicas · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

- **R194:** manifesto JSON determinístico com identidade da aula, posição curricular, posição na fila heurística, hash SHA-256 do texto e destinos locais de leitura.
- **R195:** auditoria cruzada entre o manifesto e a HTML integral gerada da mesma fonte: **245 âncoras** em 35 aulas, sete por aula (aula, texto, quatro seções e rubrica). Cada ID é único, existe exatamente uma vez e é alcançável por link local; o documento não contém scripts.
- **R196:** verificador de bytes canônicos de um único arquivo regular local, rejeitando alterações de fonte, falsos aceites, grants, novas chaves e arquivos adulterados.
- **R197:** regressões com 14 mutações de manifesto e sete mutações estruturais de HTML, além das validações herdadas.
- **R198:** CI isolado por branch, em SHA exata, com gate de liberação sempre bloqueado.

### Reprodução (somente fonte versionada, sem rede nem dados de clientes)

```sh
node scripts/build-editorial-navigation-manifest.mjs > /tmp/uni-navigation.json
node scripts/verify-editorial-navigation-manifest.mjs /tmp/uni-navigation.json
node scripts/check-editorial-navigation-manifest.mjs
node scripts/check-editorial-fragment-graph.mjs
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

O manifesto **não é um mapa de URLs publicadas**, nem comprova aceite pedagógico. Acesso real continua dependendo da fonte de contratos vigentes, revogação independente, identidade empresarial, revisão humana e os demais gates. [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

Nenhum merge, deploy, alteração da main/VPS/DNS, SSO, grants reais, custos adicionais ou acesso a clientes.
