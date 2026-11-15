# Universidade Imagine — MVP simples, prévia offline

**Estado: demonstração visual e funcional local, com dados 100% fictícios. NÃO publicar na internet ou disponibilizar a clientes.**

Este recorte dá forma à intenção de uma Universidade simples: um benefício de capacitação para clientes Imagine, não uma escola, marketplace de cursos ou novo SaaS. A identidade visual usa a cor-base laranja Imagine (#F9941D), visual claro e navegação enxuta. Logo/peças finais dependem da conferência com a identidade do Portal.

## Executar a prévia

1. Abrir o arquivo preview/index.html em navegador moderno, diretamente do computador, sem servidor.
2. Navegar entre Visão geral, Nossa metodologia, Cursos e negócios e Treinamentos Imagine.
3. Usar filtros, pesquisa, abrir cursos, alternar aulas e marcar aulas concluídas.
4. Fechar e abrir a página para conferir o progresso apenas local. Para zerar, limpar os dados do site/armazenamento local do navegador.

A prévia contém **6 cursos e 14 microaulas demonstrativas**:
- Metodologia Imagine: Visitas → Leads → Clientes (4 aulas)
- Presença digital que inspira confiança (2 aulas)
- Do primeiro contato ao relacionamento (2 aulas)
- Portal do Cliente Imagine (2 aulas conceituais)
- Primeiros passos com o Imagine Sites (2 aulas conceituais)
- Conceitos básicos do Imagine CRM (2 aulas conceituais)

As aulas são rascunhos editoriais curtos e não comprovam que determinadas telas, fluxos ou recursos já existam nos produtos. Nenhum treinamento técnico deve virar tutorial definitivo antes de haver interface homologada.

## Regras de produto preservadas

- A Universidade é **exclusiva** de clientes Imagine com serviço elegível ativo e usuários autorizados; sem venda avulsa nem catálogo público.
- O Portal é a única autoridade de identidade, empresa, vínculos e elegibilidade. Sem autorização real do Portal, o backend deve negar acesso (fail closed).
- Sem provas, notas, rankings ou certificados. Aplicação prática é opcional.
- O modelo MIA de **sete etapas** permanece vigente; a prévia não redefine essas etapas.
- A assinatura **Visitas → Leads → Clientes** organiza o ensino sem garantir resultados.
- Nenhum dado pessoal é coletado ou transmitido na prévia. O progresso é simulado no armazenamento local, por dispositivo, sem conta de usuário.
- O Tutor IA ainda não foi implementado; não pode operar sistemas nem receber dados reais antes dos gates aprovados.
- Nenhuma dependência externa, chamada de API, custo novo, deploy, autenticação real ou publicação de mídia.

## Limitações técnicas deliberadas

A prévia fica na pasta preview, fora de public; não cria rotas HTTP e não enfraquece o fallback 404 do Laravel em C-00. Ela não pode ser usada como mecanismo de controle de acesso, banco de progresso ou autorização de serviços. A marcação de concluído não é uma fonte confiável de verdade. Treinamentos reais dependem de validação com as versões efetivamente implantadas.

## Critérios de aceite desta entrega de protótipo

- [x] Navegação e filtro das três áreas essenciais
- [x] Pesquisa local, visualização das aulas e continuidade visual do progresso fictício
- [x] Identidade cromática Imagine, layout responsivo e textos de posicionamento
- [x] Sem captura de e-mail/nome, dados reais, API, pagamentos ou plano avulso
- [x] Arquivos isolados em branch para revisão, sem merge e sem deploy
- [ ] Teste visual/teclado em navegadores com execução real
- [ ] Homologação de conteúdo e treinamento nos sistemas disponíveis
- [ ] SSO/autorizações reais pelo Portal, isolamento por empresa e revogação
- [ ] Modelo real de curso/aula/progresso em Laravel/PostgreSQL
- [ ] Revisões de segurança/LGPD, testes integrados, backup e reversão
- [ ] Aprovação dos gates e autorização de implantação

## Próximo desenvolvimento

**P0 — manter enxuto:** autenticação via Portal, verificação de acesso elegível em todas as requisições, catálogo administrável, leitura das aulas, progresso por usuário/empresa e área administrativa mínima de publicação. Sem aquisição de ferramentas novas.

**P1 — conteúdo útil:** roteirizar e revisar uma trilha de metodologia e treinamentos dos sistemas já homologados; textos/prints primeiro, vídeos só se acrescentarem valor. O currículo editorial expandido de seis cursos/24 aulas é uma meta separada, não uma exigência de lançamento.

**P2 — opcionais:** busca melhorada, recomendações por pilar e tutor pedagógico supervisionado. Não adicionar gamificação, ranking, comunidade, emissão de certificados, vendas avulsas ou integrações não essenciais.

## Verificação estática

Se houver Node.js 18+ instalado: executar node preview/check.mjs a partir da raiz do repositório. Não habilitar CI, VPS, serviços ou integrações reais só para executar a verificação.

**Governança:** branch derivada de feat/uni-c00-fundacao-segura, que está em PR DRAFT #1. Não fazer merge/deploy deste recorte antes dos gates e revisões da fundação, acesso e segurança.
