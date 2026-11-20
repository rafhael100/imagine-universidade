# UNI ERD-R79–R81 — proveniência dos dois artefatos de revisão editorial (20/11/2026)

**DRAFT · SOMENTE SINTÉTICO · HOLD_NO_GO.** Este lote não implementa assinatura humana, aprovação editorial nem autorização operacional.

## Falha reproduzível e correção

O pacote anterior emitia um checklist JSON e a sua versão Markdown para as 35 aulas (210 perguntas), mas o workflow não comparava **os bytes dos dois artefatos produzidos** com o currículo original durante a entrega. Um relatório modificado depois da geração podia ser apresentado como se fosse a evidência que os scripts emitiram. Os SHA-256 descritos nas aulas não substituem a verificação da origem, pois um arquivo adulterado pode incluir hashes escolhidos pelo adversário.

- **R79:** `scripts/verify-editorial-human-artifacts.mjs` reconstrói as 35 entradas a partir de `content/mvp-cursos-v1.json` e exige igualdade exata do JSON canônico e do Markdown original. A checagem rejeita chaves extras, chaves repetidas, codificações diferentes, alterações no hash ou status de aula, ordem, rubrica, sinalizações e textos. Limite de 1 MiB por arquivo.
- **R80:** `scripts/check-verify-editorial-human-artifacts.mjs` confere o pacote válido e **24 cenários negativos** locais, inclusive aprovação fabricada, `GO`, falsa evidência humana, seção alterada, mudança da fonte, marcadores Markdown e alterações no texto de título/hash.
- **R81:** workflow isolado `uni-erd-r79-r81-artifact-qa.yml`, somente `contents: read`, sem persistir credenciais, em branch independente empilhada sobre a PR #108. Exige checkout da SHA do evento, 13/13 gates pendentes, gera os dois arquivos, compara-os e publica exclusivamente **rascunhos sintéticos** retidos sete dias. Sem deploy, banco, VPS ou fornecedores externos.

## Comandos de conferência

```bash
node scripts/check-editorial-human-checklist.mjs
node scripts/check-render-editorial-human-checklist.mjs
node scripts/check-verify-editorial-human-artifacts.mjs
node scripts/build-editorial-human-checklist.mjs > /tmp/uni-review.json
node scripts/render-editorial-human-checklist.mjs > /tmp/uni-review.md
node scripts/verify-editorial-human-artifacts.mjs /tmp/uni-review.json /tmp/uni-review.md
```

O validador liga os dois documentos à **fonte versionada na mesma árvore**; ele não é uma assinatura criptográfica independente dessa árvore. Revisores continuam obrigados a ler individualmente as 35 aulas. Os 210 checkboxes são perguntas de conferência, não aceites. Não usar estes arquivos como dados de clientes nem registro da identidade de um revisor.

## Fronteira operacional

A fonte oficial de serviço Imagine ativo, revogação independente, autenticação empresarial, `university:view` e `university:manage` continuam dependentes de [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). O `UnavailablePortalAuthority` segue negando acessos. `ops/release-gates.json`: **13/13 NOT_VERIFIED, HOLD_NO_GO**. AppSec/DBA/LGPD, revisão editorial autenticada, homologação privada, backup/restauração/rollback reais continuam sem evidência liberatória. CI verde representa apenas as verificações sintéticas nela executadas.

**Sem merge, alteração de main, deploy, VPS/DNS, SSO, grant, custo ou dados reais.**
