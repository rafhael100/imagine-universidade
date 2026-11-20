# UNI ERD-R204–R208 — mapa de cobertura para revisão das 35 aulas

**DRAFT · 10 cursos · 35 aulas · 140 seções · 210 perguntas de leitura · HOLD_NO_GO · 13/13 NOT_VERIFIED.**

Esta entrega melhora a transcrição TXT do incremento R199–R203 com um **mapa de cobertura no início** para quem revisa o currículo por curso ou por leitor de tela. Cada linha contém ordem curricular, identidade da aula, total de palavras nas quatro seções e **sinais heurísticos de leitura**, não prova de erro nem de qualidade.

- **R204:** mapa dos 10 cursos com contagem de aulas e ordem curricular estável.
- **R205:** 35 linhas rastreadas à fonte, quatro seções por aula, total de palavras e indicação contextual dos sinais de leitura; todos com PENDING_HUMAN_REVIEW e sem evidência de aceite.
- **R206:** QA independente compara o mapa ao checklist original, valida os 35 IDs únicos, 140 seções e 210 perguntas da transcrição.
- **R207:** seis mutações negativas do mapa devem ser recusadas pelo verificador byte a byte (inclusive falsa aprovação e desvio de identificador).
- **R208:** CI em branch isolada, SHA exata, revisões anteriores e verificação de todos os 13 gates de liberação.

## Reprodução local (somente conteúdo sintético versionado)

```sh
node scripts/render-editorial-reading-transcript.mjs > /tmp/uni-leitura-35-aulas.txt
node scripts/verify-editorial-reading-transcript.mjs /tmp/uni-leitura-35-aulas.txt
node scripts/check-editorial-reading-transcript.mjs
node scripts/check-editorial-reading-map.mjs
node scripts/check-editorial-navigation-manifest.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

Este mapa não é um mecanismo para marcar revisões como concluídas. A ausência de sinal heurístico **não significa aprovação**, e um sinal não comprova erro. A revisão humana autenticada das 35 aulas permanece pendente. A dependência de identidade empresarial, contrato elegível ativo e revogação independente permanece em [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Nenhum acesso real, SSO ou grant é autorizado.

Sem merge, deploy, alteração de main, VPS, DNS, custos, dados de clientes ou liberação operacional.
