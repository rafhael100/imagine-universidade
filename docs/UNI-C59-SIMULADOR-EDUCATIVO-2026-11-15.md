# UNI C-59 — simulador educativo de visitas, leads e clientes

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Na área do aluno, após autorização de sessão e catálogo, um exercício numérico permite preencher visitas por semana e duas taxas **hipotéticas** (visitas→leads e leads→clientes). O cálculo ocorre integralmente no navegador, arredondando pessoas para números inteiros; por exemplo, 1.000 visitas × 5% = 50 leads e 50 leads × 10% = 5 clientes ilustrativos.

Não solicita nomes, e-mail, segmento ou outras informações pessoais; não envia requisições e não grava localStorage/cookies. Quando o Portal revoga 403/419, os valores e resultados são limpos e campos desabilitados. Valores fora de 0–1.000.000 visitas ou de 0–100% são recusados. Há aviso claro de ausência de previsão/garantia comercial. Exercício **não é prova, nota nem certificado**.

Testes Node verificam fórmula, limites e ausência de envio; Chromium executa entradas e valida limpeza após revogação. A calculadora comercial para captação de leads é produto distinto e não é ativada por esta simulação.
