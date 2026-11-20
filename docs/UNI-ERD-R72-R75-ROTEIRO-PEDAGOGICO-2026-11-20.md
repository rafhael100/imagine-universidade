# UNI ERD-R72–R75 — roteiro pedagógico verificável das 35 aulas (20/11/2026)

**STATUS: DRAFT / TRIAGE_ONLY / HOLD_NO_GO.** Nada aqui comprova aceite humano ou disponibilidade de serviço.

## R72 — Checklist por conteúdo e identidade

O gerador `scripts/build-editorial-human-checklist.mjs` lê exclusivamente `content/mvp-cursos-v1.json` versionado e produz JSON em **stdout**, sem gravar dados, acessar rede ou consultar clientes. Invoca o auditor estrutural anterior e exige exatamente **10 cursos / 35 aulas / 140 seções**.

Cada registro inclui identidade `curso/aula`, título, SHA-256 do corpo, palavras por seção e campos explícitos `human_review=PENDING_HUMAN_REVIEW`, `human_evidence=null`, `authenticated_signoff=false`. Não altera conteúdo original, base de dados, as 35 revisões ou o estado operacional.

## R73 — Rubrica de revisão humana

Seis perguntas para cada uma das 35 aulas:

1. As afirmações, exemplos e limitações são factualmente adequados?
2. A explicação é clara para um pequeno negócio?
3. O caso fictício está claramente identificado e não se confunde com clientes reais?
4. A aplicação opcional é praticável, sem dados de pessoas reais?
5. Os cuidados de privacidade, segurança e medição são pertinentes?
6. Os produtos e serviços Imagine são descritos como disponíveis apenas quando de fato comprovado?

Sinais heurísticos contextuais registram linguagem de promessa de resultados, solicitação de dados reais, afirmações de disponibilidade geral e introduções extensas. **Flag é indício para leitura humana, não erro comprovado, garantia de conformidade ou aprovação.** Pode conter falsos positivos e omissões.

## R74 — Testes

`node scripts/check-editorial-human-checklist.mjs` confirma todas as 35 identidades e hashes; rubrica, quatro seções por aula e estados negados. Cenários negativos introduzem exemplos artificiais de promessa, pedido de dados reais, alegação de disponibilidade e texto excessivamente longo. Conteúdo publicado ou acervo incompleto é recusado pelo auditor estrutural.

## R75 — Entrega de QA e evidência

O workflow `uni-erd-r72-r75-rubric-qa.yml` roda somente na branch de revisão, com `permissions: contents: read` e `persist-credentials: false`, sintaxe Node, testes editoriais, integridade, e a verificação de que os **13 gates** continuam `NOT_VERIFIED`. A saída JSON é artefato sintético de vida curta, não um certificado.

Execução manual sem dependências externas:

```bash
node --check scripts/build-editorial-human-checklist.mjs
node scripts/check-editorial-human-checklist.mjs
node scripts/build-editorial-human-checklist.mjs > /tmp/uni-checklist-sintetico.json
node scripts/check-editorial-lesson-structure.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

A planilha/relatório auxilia o revisor a verificar **todas** as aulas. Não solicita nome de revisor, não importa CSV e não permite converter `PENDING` em `APPROVED` por código.

## Fronteira de liberação

[Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) ainda requer fonte oficial de serviços/contratos elegíveis ativos, revogação independente, identidade por empresa e autorização editorial. `UnavailablePortalAuthority` permanece ligado e nega acessos. Os 13 gates permanecem `NOT_VERIFIED`, a liberação é `HOLD_NO_GO` e o aceite pedagógico real das 35 aulas continua pendente.

**Sem merge, deploy, alteração de main, VPS, DNS, pagamento, SSO, concessão de acesso real ou dados de clientes.** Conferir a CI da SHA exata ao finalizar.
