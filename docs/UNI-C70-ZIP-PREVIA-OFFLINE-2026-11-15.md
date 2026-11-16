# UNI C-70 — pacote ZIP de prévia navegável, exclusivamente sintético

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O laboratório Chromium agora publica, como **artifact GitHub Actions** da revisão autorizada e aprovada no próprio browser-laboratory, os dois arquivos necessários para demonstração offline da Universidade: `preview/current.html` e `preview/logo-imagine.png`. O pacote contém apenas currículo **editorial de laboratório**, navegação, progresso fictício e simulador local Visitas → Leads → Clientes. Nenhuma API, login, contrato, chave, dado de cliente ou implantação na VPS está incluída.

Antes de gerar o ZIP, o job exige ambiente sintético, ausência de `.env` e aprovação do verificador `node preview/current-check.mjs`, que confere que o catálogo de 10 cursos e 35 aulas coincide com a prévia. GitHub Actions retém o pacote por **14 dias**; o download é feito na seção Artifacts do run correspondente.

Para visualizar: extraia o ZIP numa pasta, mantenha `current.html` e `logo-imagine.png` juntos e abra `current.html` no navegador. O progresso é apenas uma simulação local, não o estado de um aluno real. Para acessar a Universidade real, permanecem obrigatórios o Portal oficial de contratos ativos e revogação, SSO business e 13 gates operacionais, AppSec/DBA/LGPD e homologação privada.
