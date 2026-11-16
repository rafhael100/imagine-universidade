# UNI C-33 — Retomar meus estudos entre cursos

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.**

Implementação do botão "Retomar meus estudos" na área do cliente. Depois de receber o catálogo da API privada, o botão é habilitado apenas quando existe pelo menos um curso publicado com aulas pendentes. A função pura escolhe o curso atual quando ele ainda tem aulas não concluídas, senão o primeiro curso com progresso pendente. Ao clicar, o filtro e a busca local são redefinidos e a aula pendente é escolhida pela rotina de curso existente.

Esta ação não usa novo endpoint, armazenamento local nem consulta dados de outros alunos. Se o Portal negar acesso com 403/419, o botão é desabilitado juntamente com o catálogo já limpo. A escolha é baseada exclusivamente nos contadores do servidor, não é certificação, avaliação ou promessa de resultado.

Os testes de contrato Node verificam curso atual pendente, primeiro pendente, todos concluídos, curso vazio, catálogo inválido e ID inválido. A execução de QA e testes com navegador são gates da revisão.
