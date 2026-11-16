# UNI C-58 — jornada visível Visitas → Leads → Clientes

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O aluno vê três etapas da metodologia Imagine no topo da biblioteca. Cada cartão mostra progresso somente se **o Portal autorizou o catálogo e o curso específico foi publicado**. Trilha não publicada fica explicitamente desabilitada, sem simular uma matrícula ou exibir conteúdo de rascunho. A navegação usa os mesmos IDs obtidos do backend e a função existente de seleção autenticada; mudar de empresa ou revogar 403/419 limpa os dados dos três pilares.

Não há cache de progresso no navegador nem nova coleta de informações pessoais. O resumo só usa totais já fornecidos pelo endpoint Laravel para o sujeito e empresa atuais, inclusive preservação de versões históricas sem somá-las ao curso republicado. Testes Node e Chromium sintéticos cobrem existência dos três pilares, um publicado e dois indisponíveis, e clique no curso permitido.
