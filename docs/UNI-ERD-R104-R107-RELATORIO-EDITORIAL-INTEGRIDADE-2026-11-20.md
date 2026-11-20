# UNI ERD-R104–R107 — integridade da fila editorial (20/11/2026)

**DRAFT · revisão offline sintética · HOLD_NO_GO.**

## Defeito reproduzível (R104)

O renderizador HTML verificava 35 itens e identidades distintas, mas não garantia que os campos `original_position` eram únicos. Duas aulas com identidades diferentes podiam apontar para o mesmo `id="aula-N"`, criando links de índice ambíguos e destinos inacessíveis por teclado. O relatório Markdown também podia exibir posições repetidas. O verificador *posterior* da exportação canônica rejeitava adulterações do HTML, mas os dois renderizadores aceitavam um relatório em memória estruturalmente inconsistente.

## Implementação (R104/R105)

`scripts/validate-editorial-priority-report.mjs` é um validador puro, sem I/O e reutilizável. Ambos os renderizadores o invocam antes de montar HTML ou Markdown. Ele exige exatamente 35 IDs, 35 posições distintas de 1–35, ordenação determinística (aulas sinalizadas primeiro, depois ordem curricular), quatro seções por aula, totais de sinalização coerentes, hash SHA-256 com formato válido e nenhuma alegação de aceite. Não autentica autorias, não altera o currículo nem habilita serviços.

`scripts/check-priority-report-invariants.mjs` aplica casos negativos independentes aos dois formatos, inclusive colisão de âncoras apesar de IDs distintos, total inconsistente, permutação da fila e falsa aprovação.

## Verificações e revisão (R106/R107)

Workflow de QA isolado para a branch desta PR, com checkout da SHA exata, sem credenciais persistidas, `node --check`, regressões reais Node dos dois renderizadores, verificador de proveniência do HTML e os 13 gates em HOLD. Os artefatos continuam locais e passivos, não há login, rede, clientes, grants ou assinaturas.

Comandos locais:

```bash
node scripts/check-priority-report-invariants.mjs
node scripts/check-editorial-review-priority.mjs
node scripts/check-editorial-priority-html.mjs
node scripts/check-verify-editorial-priority-html.mjs
node scripts/check-release-gate-policy.mjs
node ops/staging/check-release-gates.mjs
```

**Limites:** apenas consistência estrutural e testes estáticos de HTML/Markdown. Não substituem revisão pedagógica humana autenticada das 35 aulas, leitor de tela, homologação empresarial ou evidências dos 13 gates. [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) permanece bloqueador; nenhum novo acesso é autorizado. Sem merge, deploy, main, VPS, DNS ou custos.
