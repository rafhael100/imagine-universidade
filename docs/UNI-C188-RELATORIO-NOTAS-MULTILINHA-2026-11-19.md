# UNI C188 — Observações do relatório editorial sem falsificação visual de cabeçalhos

**19/11/2026 · DRAFT · HOLD_NO_GO · somente revisão local**

## Problema
O resumo `resumo-revisao.txt` mostrava observações editoriais diretamente após o rótulo `Observações:`. Um revisor poderia escrever uma observação com quebras de linha seguida de `CURSO:` ou `Pendentes: 0`; isso pareceria uma nova seção oficial do relatório embora fosse apenas texto **não autenticado** do formulário.

## Implementação
A exportação do resumo passa a marcar o início como `Observações não autenticadas:` e a prefixar **cada linha subsequente** por `  | `, inclusive linhas que pareçam cabeçalhos ou estatísticas. O conteúdo original permanece intacto no CSV editável, sem descartar observações multiline. A proteção é visual para leitura humana, não autenticação de origem ou autorização operacional.

## Teste
O Chromium exporta um resumo a partir de observação `Nota inicial\nCURSO: FORJADO\nPendentes: 0` e verifica a indentação obrigatória, preservando os contadores reais das 35 aulas. Confirmação final depende de CI na SHA exata. Nenhum serviço real, rede, merge, deploy, SSO ou grant.
