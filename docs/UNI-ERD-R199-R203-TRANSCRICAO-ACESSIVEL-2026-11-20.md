# UNI ERD-R199–R203 — transcrição TXT acessível das 35 aulas

**DRAFT · HOLD_NO_GO · 13/13 NOT_VERIFIED · 0 grants · 0 aceites humanos autenticados.**

Este incremento cria uma **alternativa de leitura integral em texto simples (UTF-8)**, para revisão humana offline, impressão, leitores de tela e ambientes que não suportam o HTML. Não é uma publicação de cursos nem um fluxo de homologação/assinatura.

- **R199:** exportação determinística das 35 aulas sintéticas em ordem **curricular**, agrupadas nos 10 cursos, com texto integral e identificador da fonte.
- **R200:** 210 perguntas (seis por aula) para *leitura*, nunca aprovação; posição da aula na fila heurística, SHA-256 do corpo e aviso de PENDING_HUMAN_REVIEW.
- **R201:** comparação byte a byte do TXT com a fonte versionada, exigindo arquivo local regular de até 1 MiB, recusando symlinks, truncamento e adulteração.
- **R202:** regressão para 10 cursos / 35 textos / 210 perguntas, 12 mutações negativas, alterações de origem, falsos grants e falsos aceites.
- **R203:** CI específica de branch, HEAD/SHA exata, sem segredos nem deploy; guarda de 13 gates executada no mesmo job.

## Reproduzir (Node 20+, somente dados sintéticos versionados)

```sh
node scripts/render-editorial-reading-transcript.mjs > /tmp/uni-editorial-leitura.txt
node scripts/verify-editorial-reading-transcript.mjs /tmp/uni-editorial-leitura.txt
node scripts/check-editorial-reading-transcript.mjs
node scripts/check-editorial-navigation-manifest.mjs
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

A transcrição complementa, mas **não substitui**, o HTML navegável e os testes de WCAG/teclado. A saída não armazena respostas, observações nem assinatura; uma revisão pedagógica real ainda exige identidade e aprovação humana autenticada em processo separado. O acesso à Universidade continua negado até que a autoridade de serviços ativos e a revogação estejam homologadas na [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

Sem merge, deploy, VPS, DNS, alteração de main, SSO, grants reais, acesso a dados de clientes ou despesas.
