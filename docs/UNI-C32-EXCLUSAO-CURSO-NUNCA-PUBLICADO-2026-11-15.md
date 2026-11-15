# UNI C-32 — exclusão segura de curso nunca publicado

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Foi implementada uma operação estritamente editorial para apagar curso criado por engano que nunca foi publicado. Só a permissão university:manage pode executar DELETE administrativo, e a operação exige organização editorial, curso não publicado, exatamente uma versão draft, nenhuma versão arquivada/publicada, nenhuma aula publicada e nenhum registro de progresso. Na transação, curso é bloqueado antes de apagar aulas e versão; auditoria course.deleted é registrada no mesmo commit. Chaves estrangeiras RESTRICT preservam histórico e impedem exclusão parcial.

UI Admin pede confirmação explícita e bloqueia o botão para curso publicado. Mesmo despublicando um curso historicamente publicado, o servidor proíbe sua exclusão. Testes Laravel/SQLite sintéticos cobrem editor, cliente não autorizado, exclusão positiva, auditoria, repetição e curso arquivado protegido. CI PostgreSQL 18 e Docker ainda necessários para homologação. Sem migrar/dropar dados reais ou alterar as fronteiras de acesso do Portal.
