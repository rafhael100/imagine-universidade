# UNI ERD-R09 — CI Chromium: instalação com prazo e logs

**19/11/2026 · DRAFT · HOLD_NO_GO / NO-DEPLOY**

Na SHA `cd213e0c514357718fdad0efd8ee5e2b8cc0cf2b`, [CI #44532706573](https://github.com/rafhael100/imagine-universidade/actions/runs/44532706573) encerrou com `editorial-static=success` e `editorial-chromium=cancelled` após aproximadamente 25 minutos no passo de instalação, antes dos testes Chromium/axe. O log anterior redirecionava a saída da instalação para /dev/null, impossibilitando distinguir download, apt e npm.

A instalação passa a ter saída visível e três limites independentes: npm 180 s; dependências do navegador 180 s; download Chromium 240 s, com TERM e kill após 5 s. Assim, falhas de infraestrutura são diagnosticáveis, e nunca interpretadas como aprovação de QA. Os testes e as evidências Chromium permanecem exigidos e inalterados; a nova SHA precisa de execução completa para qualquer claim de aprovação.

A alteração somente usa o runner descartável já configurado. Não há novos serviços, gastos aprovados, acesso real, SSO, merge ou deploy. Os 13 gates continuam `NOT_VERIFIED`, `HOLD_NO_GO`.
