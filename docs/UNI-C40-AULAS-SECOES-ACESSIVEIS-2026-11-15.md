# UNI C-40 — leitura acessível das aulas com seções explícitas

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

A renderização das 24 aulas desenvolvidas em C-39 converte os separadores textuais de conteúdo em títulos semânticos: exemplo fictício, aplicação opcional e cuidado importante. Aula e texto são sempre inseridos via `textContent` em elementos `h3`, `h4` e `p`, sem `innerHTML`, template remoto, Markdown dinâmico ou execução de scripts do conteúdo. As demais 11 aulas são exibidas como texto corrido sem alteração.

A função pura de segmentação reconhece somente cabeçalhos literais previamente definidos; conteúdo desconhecido é preservado como texto. A tipografia responsiva mantém quebras de linha e contrasta títulos em fundo claro.

O contrato Node simula leitura de quatro blocos, assegura sequência de títulos e verifica que conteúdo como tags HTML não é interpretado. Ainda requer validação com leitores de tela e navegador real e revisão editorial humana.
