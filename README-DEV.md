# Universidade Imagine — Guia da implementação em revisão

**18/11/2026 — desenvolvimento contínuo na PR #85.**

Esta branch contém a aplicação candidata Laravel 13 / PHP 8.3+, com dependências fixadas em `composer.lock`, migrações e testes executados em laboratórios descartáveis. A implementação não está implantada para clientes. O histórico da fundação C-00 permanece nos documentos datados de 04/11; as referências antigas a testes nunca executados não descrevem o estado atual desta branch.

## Fluxo implementado

| Área | Comportamento |
|---|---|
| Acesso | Rotas privadas dependem de credencial de sessão verificada pelo Portal e empresa autorizada. A implementação padrão nega todo acesso enquanto a integração real estiver pendente. |
| Biblioteca do aluno | Catálogo compartilhado publicado, categorias, pesquisa privada, trilhas e retomada de aula pendente. A localização local de aulas por título ou identificador preserva a aula aberta, a ordem completa e a próxima pendente. Respostas incompletas não ativam conteúdo ou ações. Quando um catálogo completo validado omite o curso aberto, sua leitura é encerrada e as referências pessoais são preservadas. |
| Busca de aulas | Consulta privada com até oito resultados por página, continuação e reinício explícitos. A página substitui a anterior e preserva o estudo aberto até o aluno escolher uma aula exata. O cursor é autenticado e revalidado com o catálogo atual; alterações na referência pedem reinício. Atualização da biblioteca, nova consulta e perda de acesso invalidam respostas antigas, sem guardar consultas no navegador. |
| Orientações do curso | O editor pode informar Para quem e Conhecimentos úteis, com até 500 caracteres Unicode por campo. Os textos são opcionais, participam da conferência de publicação e aparecem literalmente no curso autorizado. Campos vazios ficam ocultos; atualizar outro dado preserva as orientações, e apagá-las exige edição explícita. Não condicionam a leitura ou a conclusão de aulas. |
| Aprendizagem | Leitura textual, conclusão opcional, próxima aula/curso e exportação do progresso próprio. A exportação conserva as referências originais e normaliza as datas para UTC com precisão de segundos; uma data inválida impede o arquivo inteiro. Sem provas, notas, certificados ou classificação. |
| Orientação na leitura | Navegação explícita entrega foco ao destino autorizado, respeitando interações durante o carregamento. Um índice local permite saltar entre seções editoriais existentes; o texto completo permanece visível em parágrafos, sem registrar leitura ou alterar progresso. |
| Histórico pessoal | Consulta manual e paginada das conclusões próprias, com referência exata de curso/aula/versão, data original e disponibilidade. A retirada mantém a referência; republicar não transfere a conclusão para uma nova versão. |
| Outros cursos do tema | Até três outros cursos da mesma categoria, na ordem do catálogo autorizado. Abertura explícita e opção de ocultar durante a visita, sem perfil, classificação pessoal ou histórico de cliques. |
| Aula guardada | Uma posição explícita por pessoa e empresa, com retorno à aula e versão exatas, remoção e exportação da referência. Navegação e conclusão não salvam posição automaticamente. Conflitos exigem nova consulta e ação; versões retiradas não são remapeadas. |
| Favoritos | Cursos salvos por pessoa e empresa, filtro opcional e exportação própria de referências/data. O gerenciamento paginado permite consultar e remover referências próprias, inclusive as de cursos indisponíveis, preservando o conteúdo retirado. Uma remoção sem recibo válido, inclusive pelo botão do curso, permanece não confirmada e pede consulta manual das referências; a ausência na lista de publicados não prova exclusão. O estudo continua disponível. |
| Ajuda contextual | Trechos literais da aula autorizada, fonte e versão; pergunta opcional pelo contrato do Tutor. Indisponibilidade da IA mantém o estudo estático. O gateway externo permanece desativado. |
| Editor | Cadastro, edição, prévia, conferência de versão e publicação/retirada de cursos. Busca local, categoria e situação ajudam a localizar cursos; o curso em edição permanece visível fora dos filtros. A busca de aulas usa título/identificador e mantém a aula em edição, os formulários e as posições da lista completa. Subir/Descer move aulas de rascunho em uma operação atômica, comparando a ordem completa e preservando o conteúdo. Salvar apenas texto de curso ou aula preserva a ordem atual; alterar sua posição numérica compara o valor anterior sob o lock do curso. Rascunhos não salvos bloqueiam o movimento; conflitos preservam os campos e exigem consulta manual. |
| Confirmação editorial | Criação, edição, exclusão, publicação e retirada conferem os indicadores exatos da resposta antes de atualizar os formulários. Uma resposta incompleta ou contraditória mantém os campos e a seleção, bloqueia novas gravações e exige consulta manual, sem repetir a operação. |
| Formulário e prévia | Uma nova aula só permite edição depois de existir curso autorizado salvo. Editar título ou conteúdo invalida a prévia anterior; o próximo clique mostra o texto atual e preserva os dois formulários. |
| Histórico editorial | Consulta manual e paginada de alterações de curso/aula, com datas preservadas e identificadores seguros. Cada página é validada por inteiro; resposta incompleta ou falha informa indisponibilidade, com nova consulta manual, e preserva os formulários. |
| Visão do acervo | Totais e categorias dos cursos editoriais, aulas da versão mais recente e avisos de ausência de aula/resumo. O painel não consulta dados individuais de aprendizagem nem aprova publicações. |
| Versões arquivadas | Consulta editorial paginada de versões anteriores, lista de aulas e leitura de um conteúdo histórico por vez. O painel preserva os formulários atuais e não restaura, edita ou publica versões. |
| Integridade | Escritas conferem autorização atual dentro da transação; dados pessoais de aprendizagem são isolados por pessoa/empresa; versões publicadas e histórico são protegidos. IDs de rota são conferidos antes da conversão numérica; valores acima da faixa do runtime recebem resposta privada de não encontrado, mantendo os formatos e retornos legados de IDs representáveis. |
| Ambiente candidato | PHP/Nginx/PostgreSQL, sessão persistente, porta de loopback explícita, papéis de banco separados e inventário somente de leitura. Nenhuma inicialização automática. |

O acervo de desenvolvimento tem 10 cursos e 35 aulas em rascunho. Os textos exigem revisão humana antes da publicação; o pacote editorial da CI não concede aprovação.

## Onde trabalhar

- `app/Domain/Access/`: identidade, grants, verificação de envelope e proteção contra repetição. Um envelope válido, isoladamente, não concede acesso.
- `app/Domain/Learning/`: catálogo editorial, dados pessoais de aprendizagem e operações transacionais.
- `app/Domain/Tutor/`: contrato consultivo; `DisabledTutorGateway` é o padrão.
- `app/Http/`: fronteira privada, middleware e endpoints.
- `resources/views/university/`: interfaces reais do aluno e editor, com o design Imagine.
- `tests/`: testes de domínio e Laravel com decisões e dados sintéticos.
- `scripts/`: verificadores e laboratórios descartáveis; os scripts de navegador/contêineres exigem CI explícita.
- `ops/staging/`: template e inventário de infraestrutura; `ops/release-gates.json` registra as dependências operacionais.
- `content/` e `preview/`: materiais em rascunho e demonstração offline, sem autorização para hospedagem pública.

## Validação de código

As verificações abaixo não conectam modelos, Portal operacional ou VPS:

```bash
node scripts/check-ui-contract.mjs
node scripts/check-learning-content.mjs
node ops/staging/check-inventory.mjs
node ops/staging/check-compose-static.mjs
node ops/staging/check-release-gates.mjs
```

Com PHP 8.3+, as extensões exigidas e dependências fixadas instaladas em ambiente de teste autorizado:

```bash
composer validate --no-check-publish
vendor/bin/phpunit --testsuite Unit
vendor/bin/phpunit --testsuite Feature
```

O workflow `uni-branch-qa-isolated.yml` executa backend e PostgreSQL. Commits da branch de revisão marcados com `[uni-full-qa]` também executam Chromium, Docker, imagens e integração privada de três serviços. O teste Compose verifica a configuração resolvida com valores fictícios e não inicia serviços. As proteções de execução não devem ser contornadas para executar o laboratório localmente.

O job de navegador inclui dois percursos complementares: falhas controladas sobre as views reais e uma jornada HTTP pelo Laravel, com SQLite e sessões reais. A segunda usa três identidades sintéticas em `tests/Browser`, fora da imagem runtime, e mantém CSRF e middleware. Seus resultados só contam quando a etapa correspondente termina com sucesso; a preparação do laboratório não comprova a jornada inteira. As esperas têm prazos e diagnóstico por etapa, sem publicar cookies, tokens ou logs privados.

Os resultados válidos são os associados ao SHA exato da [PR #85](https://github.com/rafhael100/imagine-universidade/pull/85). Uma execução antiga aprovada não valida alterações posteriores.

## Condições para o fluxo operacional

Permanecem a fonte oficial de elegibilidade/revogação, o estabelecimento da sessão SSO, as permissões editoriais oficiais, a comunicação privada entre serviços e a homologação de infraestrutura, restauração, privacidade e conteúdo. A dependência central está no [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

A política aprovada prevê 120 dias para progresso e favoritos após a perda da última elegibilidade. O relógio de retenção depende do evento oficial de perda; a aplicação não inventa esse evento nem o substitui por data de criação do registro.

A posição de leitura é uma preferência pessoal mínima, sem histórico de visualizações. Remover apaga a referência e sua data, mantendo somente a revisão vazia necessária para rejeitar gravações antigas. Esse estado também deve entrar na futura retenção autorizada. Tickets de ausência expiram em cinco minutos; uma eliminação excepcional antecipada precisa invalidar sessões/tickets antes de remover o estado de concorrência. Nenhum purger operacional foi habilitado.

O desenvolvimento pode prosseguir sobre o código candidato sem declarar essas condições concluídas. O estado de liberação continua `HOLD_NO_GO`, sem merge ou deploy automáticos. Segredos, dados reais e cópias de bancos operacionais não pertencem ao repositório nem às fixtures de teste.
