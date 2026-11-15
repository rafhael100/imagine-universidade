# UNI C-06 — telas privadas Laravel prontas para homologação

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Entrega

Foram criadas duas páginas Blade independentes das prévias offline e vinculadas às rotas existentes da API privada:

1. **Cliente** — /universidade/private/app, exige university:view.
   - Abre somente depois de grant Portal verificado no servidor.
   - Inicializa idempotentemente a organização educacional por POST protegido por CSRF.
   - Exibe catálogo compartilhado Imagine por categoria.
   - Lista aulas publicadas, apresenta texto e registra progresso individual.
2. **Administração Imagine** — /universidade/private/admin/app, exige university:manage.
   - Cria curso em rascunho, edita título/descrição/categoria/ordem.
   - Adiciona/edita aulas de texto, lista aulas, publica ou despublica.
   - Não permite editar curso publicado sem antes retirá-lo do ar, preservando versões.
   - A permissão gerencial nunca é presumida a partir da permissão de cliente.

As páginas usam identidade Imagine laranja #F9941D, layout responsivo, tipografia legível, HTML seguro via textContent, chamadas API same-origin, cookies de sessão e token CSRF do Laravel. Nenhum framework JS adicional, script externo, analytics ou arquivo público de curso foi incluído.

## Segurança

- Todas as páginas e operações estão **atrás de middleware** verificador. O provider padrão do Portal **continua negando todas as autorizações**, portanto as páginas não podem ser acessadas hoje.
- Frontend **não** recebe, armazena ou gera tokens do Portal; a sessão é custodiada exclusivamente no backend.
- O conteúdo das aulas é renderizado como texto simples, não HTML injetado.
- API mantém bloqueio de cache privado, filtro por organização/empresa e revisões curtas.
- Testes Feature de anonimato agora cobrem as páginas e endpoints.

## Verificações realizadas

- Sintaxe de JavaScript das duas páginas passou na verificação estática.
- Confirmados: noindex, CSRF, fetch same-origin, ausência de fontes de JS externas e ausência de innerHTML no código das páginas.
- Rotas VIEW/MANAGE e testes negativos registrados.

## Próxima homologação necessária

1. Executar Composer/PHPUnit/feature e migrações em ambiente isolado autorizado.
2. Implementar SSO/autorização real (Portal issue #848), revogação e revisão de segurança.
3. Testar sessão e CSRF nas duas interfaces no navegador real; garantir que todas as requisições respondam com status/erros esperados.
4. Testar Postgres multiempresa, auditoria do editor, versão/publicação, backup/rollback, LGPD e acessibilidade.
5. Confirmar identidade visual com assets aprovados da Imagine Portal antes de publicar.

**Nenhuma tela foi implantada, nenhum curso foi publicado e nenhum dado real foi processado.**
