# Universidade Imagine — Guia da implementação em revisão

**17/11/2026 — desenvolvimento contínuo na PR #85.**

Esta branch contém a aplicação candidata Laravel 13 / PHP 8.3+, com dependências fixadas em `composer.lock`, migrações e testes executados em laboratórios descartáveis. A implementação não está implantada para clientes. O histórico da fundação C-00 permanece nos documentos datados de 04/11; as referências antigas a testes nunca executados não descrevem o estado atual desta branch.

## Fluxo implementado

| Área | Comportamento |
|---|---|
| Acesso | Rotas privadas dependem de credencial de sessão verificada pelo Portal e empresa autorizada. A implementação padrão nega todo acesso enquanto a integração real estiver pendente. |
| Biblioteca do aluno | Catálogo compartilhado publicado, categorias, pesquisa privada, trilhas e retomada de aula pendente. Respostas incompletas não ativam conteúdo ou ações. |
| Aprendizagem | Leitura textual, conclusão opcional, próxima aula/curso e exportação do progresso próprio. Sem provas, notas, certificados ou classificação. |
| Favoritos | Cursos salvos por pessoa e empresa, com acesso limitado ao catálogo atualmente publicado. O filtro é opcional e a indisponibilidade dos favoritos não bloqueia o estudo. |
| Ajuda contextual | Trechos literais da aula autorizada, fonte e versão; pergunta opcional pelo contrato do Tutor. Indisponibilidade da IA mantém o estudo estático. O gateway externo permanece desativado. |
| Editor | Cadastro, edição, prévia, conferência de versão e publicação/retirada de cursos. Rascunhos de curso e aula são preservados durante as gravações relacionadas. |
| Integridade | Escritas conferem autorização atual dentro da transação; dados pessoais de aprendizagem são isolados por pessoa/empresa; versões publicadas e histórico são protegidos. |
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

Os resultados válidos são os associados ao SHA exato da [PR #85](https://github.com/rafhael100/imagine-universidade/pull/85). Uma execução antiga aprovada não valida alterações posteriores.

## Condições para o fluxo operacional

Permanecem a fonte oficial de elegibilidade/revogação, o estabelecimento da sessão SSO, as permissões editoriais oficiais, a comunicação privada entre serviços e a homologação de infraestrutura, restauração, privacidade e conteúdo. A dependência central está no [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).

A política aprovada prevê 120 dias para progresso e favoritos após a perda da última elegibilidade. O relógio de retenção depende do evento oficial de perda; a aplicação não inventa esse evento nem o substitui por data de criação do registro.

O desenvolvimento pode prosseguir sobre o código candidato sem declarar essas condições concluídas. O estado de liberação continua `HOLD_NO_GO`, sem merge ou deploy automáticos. Segredos, dados reais e cópias de bancos operacionais não pertencem ao repositório nem às fixtures de teste.
