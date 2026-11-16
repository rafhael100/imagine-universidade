# UNI C-10 — exclusão segura de aula em rascunho

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Motivação
O painel administrativo real já consegue criar, editar, publicar e despublicar cursos e aulas, mas faltava corrigir aulas cadastradas por engano sem recriar o curso inteiro. Esta etapa permite **excluir somente aulas ainda em rascunho**, preservando todo conteúdo publicado/arquivado e progresso registrado.

## Implementado
- `DELETE /universidade/private/admin/lessons/{lessonId}` somente no grupo privado `university:manage` e sessão Portal revalidada pelo middleware.
- `UniversityCatalogRepository::deleteDraftLesson` limita a aula ao acervo editorial Imagine e verifica curso não publicado, versão em `draft`, aula ainda não publicada e ausência de progresso.
- O backend trava primeiro o curso, respeitando a mesma ordem de bloqueio da publicação e da edição; exclui e gera a ação `lesson.deleted` na **mesma transação**. Uma falha de auditoria impede commit da exclusão.
- A interface Admin adiciona botão **Excluir rascunho**, habilitado apenas quando há aula selecionada e editável; exige confirmação explícita antes do DELETE.
- Testes Feature escritos para cliente/anônimo negados, editor autorizado, auditoria da exclusão, impedimento da publicação sem aulas e prevenção de exclusão diante de progresso legado.

## Preservação
Não é possível excluir aula publicada/arquivada por este endpoint. Se houver registro de progresso para a aula, mesmo em um estado legado inconsistente, a exclusão é recusada para evitar cascata de perda de histórico. Não foi criada exclusão de cursos, contas, empresas ou usuários.

## Verificações
- Inspeção direta do código aprovado na branch: 12 invariantes de escopo, permissão, flags, progresso, auditoria, rota, interface e testes passaram.
- Sintaxe do JavaScript da tela Admin verificada com sucesso.
- **PHPUnit e transações reais ainda NÃO executados**; o laboratório com Composer/pdo_sqlite/PostgreSQL continua indisponível.

## Gates mantidos
O Portal ainda não disponibiliza concessões reais de `university:view` / `university:manage` nem sessão de negócio homologada. Provider padrão permanece deny-all. Nenhum merge, deploy, uso de dados reais ou pagamento adicional. A liberação depende da integração Portal #848, PostgreSQL em staging isolado, backups, revisão LGPD/SEG e testes ponta a ponta.
