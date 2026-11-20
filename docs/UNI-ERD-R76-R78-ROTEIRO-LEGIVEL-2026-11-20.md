# UNI ERD-R76–R78 — versão legível do checklist editorial (20/11/2026)

**DRAFT / HOLD_NO_GO.** Este documento de triagem não autentica revisão, não libera aulas e não concede acessos.

A PR anterior #107 criou um checklist JSON com o SHA-256 de cada aula e uma rubrica de seis perguntas. A entrega **R76** acrescenta uma representação Markdown legível com **35 entradas numeradas, 35 hashes e 210 caixas de conferência manual**, agrupadas na ordem do currículo versionado. Cada entrada traz o título original, identificador curso/aula, quatro contagens de palavras e possíveis alertas heurísticos.

A formatação é local (`node scripts/render-editorial-human-checklist.mjs`), e o título é escapado para evitar criação de tags ou comandos Markdown pela fonte. Não inclui dados de clientes, anotações privadas ou API remota. As caixas significam apenas passos de leitura: nenhum clique ou preenchimento é uma aprovação ou prova de identidade.

**R77** inclui testes de contagens, consistência da fonte, recusa de release `GO`, recusa de `authenticated_signoff=true` e escape de título potencialmente malicioso. **R78** adiciona execução isolada CI para gerar tanto `JSON` quanto `Markdown` e preservar ambos por sete dias, com checagens dos 13 gates e sem serviços externos.

```bash
node scripts/check-editorial-human-checklist.mjs
node scripts/check-render-editorial-human-checklist.mjs
node scripts/render-editorial-human-checklist.mjs > /tmp/uni-35-aulas-revisao-sintetica.md
```

O material ajuda o revisor a percorrer todas as aulas, mas a aceitação humana precisa ser registrada em processo **autenticado e independente**. O critério `educational_editorial_signoff` continua `NOT_VERIFIED`. O [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) continua bloqueando a fonte oficial de serviço ativo, revogação e identidade empresarial; `UnavailablePortalAuthority` continua deny-all.

**Proibidos:** merge, deploy, alterar `main`, VPS, DNS, SSO, concessões reais, gastos e acesso a clientes. Conferir SHA e CI final antes de considerar QA concluído.
