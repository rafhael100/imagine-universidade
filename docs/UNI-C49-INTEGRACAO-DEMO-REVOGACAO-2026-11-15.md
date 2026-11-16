# UNI C-49 — consolidação da autorização e prévia offline

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY

Reuniu as contribuições paralelas #56 (dupla validação de acesso em GET/HEAD e nova revalidação dos resultados de consultas do repositório) e #58 (demonstração offline atual do currículo, com 10 cursos e 35 aulas). Ambas foram copiadas para a revisão integrada com histórico de autoria preservado nas PRs de origem, sem mesclar branches ou mexer na main.

O middleware passa a verificar novamente o Portal no fim das leituras, incluindo empresa, sujeito, permissão e revisão. O banco reavalia validade temporal do grant após consultas. Dois testes adversariais de #56 foram incorporados sem remover o teste específico de revogação durante exportação de #55.

A prévia atual é arquivo HTML local, com currículo idêntico ao manifesto, filtros, pesquisa, 24 aulas práticas, marca original e progresso fictício. Não usa rede/API nem concede acesso, não está em public/ nem no Docker. Seu teste Node roda na fase isolada de CI. O Chromium sintético da revisão #57 permanece na mesma branch.

Nenhuma modificação habilita SSO, contratos reais, PortalAuthority, Tutor IA externo ou deploy. As pendências P0 do Portal #886 continuam bloqueadoras.
