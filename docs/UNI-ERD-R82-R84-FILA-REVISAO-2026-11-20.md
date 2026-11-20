# UNI ERD-R82–R84 — fila de prioridade para leitura das 35 aulas (20/11/2026)

**DRAFT, somente dados sintéticos, sem concessão de acesso.** A existência do checklist anterior não garante que as 35 aulas foram lidas ou aprovadas.

## O que mudou

- **R82 — Fila de leitura determinística:** `scripts/build-editorial-review-priority.mjs` deriva 35 itens com identidade, hash, curso/título e contagem das quatro seções do mesmo currículo versionado. Aulas com algum *sinal heurístico* aparecem primeiro; dentro de cada grupo a ordem curricular original é mantida. Sem classificação automática de qualidade nem afirmação de violação.
- **R83 — Qualidade:** regressões confirmam todas as 35 identidades e 210 perguntas, ausência de duplicações, prioridade estável, textos Markdown escapados e rejeição de nove falsificações de aprovação, alteração de status, grants ou release. Uma mutação sintética com promessa de vendas deve subir para o grupo de inspeção prioritária.
- **R84 — Handoff:** workflow `uni-erd-r82-r84-editorial-priority-qa.yml` gera JSON e Markdown, executa verificações da fonte e 13 gates e disponibiliza dois artefatos por sete dias, sem acesso a bancos, nuvem ou clientes. Checkout e CI são vinculados à SHA exata.

## Executar em ambiente de teste

```bash
node scripts/check-editorial-review-priority.mjs
node scripts/build-editorial-review-priority.mjs --markdown > /tmp/uni-priority.md
node scripts/build-editorial-review-priority.mjs --json > /tmp/uni-priority.json
```

O revisor pode começar pelos potenciais pontos de atenção, mas deve **ler todas as 35 aulas**, preencher a rubrica de seis critérios para cada uma e registrar ajustes e aceite por meio de um fluxo editorial autenticado independente. Ausência de sinal automático jamais equivale a aprovação. Os 35 rascunhos continuam `PENDING_HUMAN_REVIEW`.

## Bloqueios que continuam

`HOLD_NO_GO`: **13/13 `NOT_VERIFIED`** em `ops/release-gates.json`, inclusive aceite editorial autenticado e fonte oficial de serviços ativos, revogação, SSO e permissão empresarial da [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). O binding operacional `UnavailablePortalAuthority` continua negando tudo. A fila não publica aulas, não substitui AppSec/DBA/LGPD e não gera grants.

Sem merge, alteração de `main`, deploy, VPS/DNS, gastos, dados de clientes ou SSO.
