# UNI C173 — Parser CSV estrito sem ambiguidade de aspas

**Data:** 19/11/2026. **Limites:** QA e revisão editorial offline; sem rede, usuários reais, Portal operacional, merge ou deploy.

## Correção

Identificada diferença de segurança no parser CSV presente tanto no navegador quanto na validação CLI. Uma célula com aspas encerradas antecipadamente, por exemplo `"PENDING_HUMAN_"REVIEW`, era interpretada como `PENDING_HUMAN_REVIEW`, embora a entrada não seja CSV canônico. Também era possível obter a identidade correta de uma aula mediante concatenação implícita após uma aspa final. Isso enfraquece a revisão humana de evidências textuais porque o arquivo tem representação diferente do que o parser aceita.

O parser passa a registrar o encerramento de cada campo entre aspas e exige que o caractere seguinte seja separador ou quebra de linha CRLF/LF. Aspas escapadas `""`, textos com vírgulas, semicolon do Excel brasileiro, BOM e observações legítimas multilinha continuam suportados.

## Ensaios novos

- CLI: dois casos negativos com texto após aspas finais, um alterando status e outro alterando o slug da aula, preservando propositalmente o valor previamente interpretado.
- Chromium `file://`: importa CSV não canônico por mesclagem e verifica recusa anterior a qualquer alteração das duas revisões locais existentes.
- Continuidade: 35 aulas, SHA-256 e status `HOLD_NO_GO` mantidos; controles Unicode C172 e validação anterior permanecem.

**Critério técnico:** CI da HEAD com `[uni-full-qa]` deve passar, incluindo parser, integração framework, PostgreSQL, Docker e navegador. Isto não implica aprovação editorial humana nem autorização operacional; Portal #886 e todos os 13 gates persistem pendentes.
