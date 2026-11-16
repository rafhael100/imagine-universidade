# Universidade Imagine — MVP simples, prévia offline

## Prévia atualizada para aprovação visual — UNI C-48

Abra **`preview/current.html`** (ou execute um servidor local preso a `127.0.0.1`, somente na pasta `preview`) para navegar pelo catálogo **atual de 10 cursos e 35 aulas** em conteúdo editorial sintético. A logomarca original foi copiada byte a byte; a prévia tem busca, filtros, leitura das 24 aulas práticas, retomada e conclusão **somente neste navegador**. Não chama APIs, não exige login e não prova integração Portal. **Nunca publique o diretório `preview/` na internet ou na VPS**: a prévia antiga `index.html`/`admin.html` também não possui autenticação operacional.

O teste `node preview/current-check.mjs` valida estrutura, integridade do catálogo e SHA da logo e executa automaticamente no GitHub Actions isolado. O frontend Laravel real continua em `resources/views/university/` e segue deny-all até contrato ativo, sessão e revogação oficiais. **Os arquivos `preview/` não fazem parte da imagem Docker de execução nem do diretório público Laravel.**



**Estado: demonstração visual e funcional local, com dados 100% fictícios. NÃO publicar na internet ou disponibilizar a clientes.**

Este recorte dá forma à intenção de uma Universidade simples: um benefício de capacitação para clientes Imagine, não uma escola, marketplace de cursos ou novo SaaS. A identidade visual usa a cor-base laranja Imagine (#F9941D), visual claro e navegação enxuta. Logo/peças finais dependem da conferência com a identidade do Portal.

## Testar a jornada de demonstração (sem acesso real)

1. Abra preview/admin.html e selecione um curso fictício.
2. Adicione uma aula ou edite título e descrição; salve o curso.
3. Clique em **Publicar na demonstração** (somente armazenamento deste navegador).
4. Abra ou atualize preview/index.html **no mesmo navegador e origem**; o curso aparecerá na biblioteca.
5. Leia a aula, marque concluída e volte ao painel; simule despublicação e atualize a biblioteca: o curso desaparece.
6. Para restaurar os dados editoriais, use **Restaurar dados fictícios** no painel.

Se o navegador restringir armazenamento em arquivos locais, inicie um servidor estático **somente na pasta preview e somente no computador local**: python -m http.server 8765 --bind 127.0.0.1 --directory preview. Então use http://127.0.0.1:8765/admin.html e http://127.0.0.1:8765/index.html. Nunca use 0.0.0.0, IP público, VPS ou pastas que contenham .env/código privado para essa demonstração.

Esta integração simula **edição → publicação → estudo** apenas no browser. Não há SSO, permissão real, banco, entrega de cursos a clientes nem compartilhamento entre dispositivos. O painel administrativo não possui login real e não pode ser publicado. Use exclusivamente conteúdo fictício.

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
