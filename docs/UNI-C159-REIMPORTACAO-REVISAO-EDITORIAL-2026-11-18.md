# UNI C-159 — Retomar revisão editorial por CSV com integridade atômica

## Resultado

A interface offline de revisão editorial pode importar um arquivo revisao.csv
exportado anteriormente, mantendo o trabalho sem cadastro, rede ou backend.

A importação utiliza apenas a File API do navegador e exige:

- exatamente o cabeçalho de sete colunas e 35 aulas;
- par curso/aula único e pertencente ao conteúdo atual;
- hash SHA-256 correspondente à versão atual de cada texto;
- status exclusivamente PENDING_HUMAN_REVIEW, NEEDS_CHANGES ou
  CLAIMED_HUMAN_APPROVED (declaração não autenticada);
- revisor e evidência válidos quando o status não for Pendente;
- nenhuma fórmula de planilha ou conteúdo inválido nos campos de texto.

O arquivo é validado INTEIRO antes de substituir os buffers do navegador.
Falha, aula duplicada, hash desatualizado ou CSV incompleto preservam o trabalho
anterior. Quando há observações locais não exportadas, o usuário precisa
confirmar antes de importação substitutiva.

## QA

scripts/qa-browser-editorial-offline.cjs executa o HTML real em Chromium
offline, exporta revisao.csv, passa o arquivo pelo validador canônico
scripts/validate-editorial-review.mjs e o reimporta em nova página.
Depois tenta importar uma planilha com hash adulterado e confirma rejeição
sem perda dos campos anteriores.

Confirma zero requisições HTTP, integridade de estado, CSP sem erro e
que publishable=false mesmo após reimportação.

## Restrições

Nenhum login, rede, gravação de servidor, localStorage, autoconfirmação,
SSO, concessão de serviço ou publicação. A ferramenta permanece offline,
com assinatura humana operacional ainda pendente e gates HOLD_NO_GO.
Sem merge ou deploy.
