# UNI C-154 — CI de navegador: corrigir deadline global de 180 s

## Falha concreta na HEAD C153

O run GitHub Actions [#44348181935](https://github.com/rafhael100/imagine-universidade/actions/runs/44348181935),
para o commit `92aa98e8a9eb4162557ca4aee5009c9b80c3ee00`, teve cinco
jobs aprovados, mas o `browser-lab` falhou. A última asserção registrada
foi um cenário de ordenação editorial C137. A falha seguinte ocorreu
quando o watchdog global fechou o navegador após **180.000 ms**, fazendo
`locator.click` responder com "Target page, context or browser has been
closed". Não houve relato de falha de asserção antes desse fechamento.

O run anterior [#44297441916](https://github.com/rafhael100/imagine-universidade/actions/runs/44297441916)
completou o mesmo laboratório, com **904 checks**, já perto desse limite.
Isso identifica um orçamento global insuficiente para a suíte crescente,
não comprova que todos os cenários no run falho passaram.

## Correção

- Manter todos os testes, fluxos e asserts, inclusive o C137; nada foi
  ignorado, desabilitado ou simulado em substituição ao Chromium.
- Ampliar o watchdog de **180 s para 300 s**, ainda estritamente inferior
  ao limite do job isolado de **25 minutos**.
- Registrar um checkpoint a cada 100 asserções com total e tempo decorrido.
  Ao atingir o watchdog, registrar também tempo e número de checks.
- Preservar os timeouts locais Playwright (ações/esperas) e o comportamento
  de erro com código não zero. Um deadlock ainda falha dentro do orçamento.
- A condição de CI sintética, host loopback, evidências, bloqueios de rede,
  testes de acessibilidade e ausência de deploy permanecem inalterados.

## Aceite

Exigir `browser-lab` concluído com sucesso e seu `summary.json`, além
de `validation`, `portal-contract-parity`, `editorial-review-pack`,
`docker-lab` e `staging-image-lab` na **mesma SHA**. Uma CI
parcialmente verde não é apresentada como homologação integral.

O ambiente de edição não executa Chromium; a verificação completa depende
de runner GitHub Actions explicitamente isolado. Mesmo com CI integral
aprovada, os treze gates operacionais continuam `HOLD_NO_GO`.
