# UNI C-30 — Trilha transversal 6 cursos / 24 aulas em rascunho

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Conteúdo adicional alinhado à diretriz aprovada Visitas → Leads → Clientes (ver documento editorial UNI-TRILHA). A trilha foi adicionada ao manifesto editorial estritamente sintético como seis novos cursos e 24 aulas curtas, com ações práticas opcionais, foco em clareza, privacidade e ausência de resultados garantidos. Quatro cursos e onze aulas preexistentes foram preservados. A biblioteca total de teste agora soma dez cursos e trinta e cinco aulas, **todos em rascunho e inacessíveis a clientes reais**.

O importador já era idempotente: não reescreve conteúdo editorial editado/publicado; só cria cursos novos quando ausentes. Os testes de importação, HTTP multiempresa, scripts de QA Docker e workflow foram atualizados para as novas contagens. Não instalar dados em produção nem ativar o importer fora de APP_ENV=testing. A revisão de textos e acessibilidade editorial continua necessária antes de publicação.
