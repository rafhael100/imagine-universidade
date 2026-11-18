# UNI C-158 — Ensaio real da interface editorial offline no Chromium

## Motivação

O pacote C157 contém 35 aulas em uma página offline com exportação de CSV.
Testes estáticos de HTML/CSP não exercem os cliques, preservação de formulários,
download Blob ou compatibilidade do CSV com o validador já adotado.

## Laboratório acrescentado

scripts/qa-browser-editorial-offline.cjs abre o HTML gerado, como arquivo local,
em Chromium real descartável, sem interceptar a execução do script da interface.
O laboratório verifica:

- os 10 cursos, 35 aulas pendentes, leitura integral e navegação;
- preenchimento de observações e estado NEEDS_CHANGES sem publicar;
- persistência dos campos ao alternar aulas dentro do mesmo navegador;
- download de revisao.csv e análise do arquivo pelo validador canônico;
- confirmação de 34 pendentes, 1 precisa de ajustes, 0 declarações aprovadas,
  review_evidence_authenticated=false e publishable=false;
- recusa de observações iniciadas por fórmula de planilha;
- zero solicitações HTTP, ausência de erro de JavaScript/CSP e responsividade
  sem rolagem horizontal a 390 pixels.

A prova fica no mesmo job browser-lab sintético, já obrigado a rodar em
runner descartável do GitHub Actions, e gera uma captura de tela de revisão.

## Limites

O navegador manipula apenas dados fictícios. O teste não autentica pessoas
revisoras, não valida evidência GitHub, não autoriza publicação e não libera
acesso ao público nem a clientes. O release continua HOLD_NO_GO e PR DRAFT.
Não há DNS, VPS, merge, deploy ou alterações de produção.
