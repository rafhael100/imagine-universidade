# UNI C-36 — exportação restrita do progresso individual

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.**

O endpoint privado GET /universidade/private/progress/export exige o grant autenticado `university:view` do Portal e usa somente `companyId` e `subjectId` do objeto verificado pelo middleware Laravel. Nunca recebe identidade do navegador. Exporta JSON de versão 1 com slug do curso, número da versão, slug da aula e instante de conclusão, sem IDs internos, e-mails, credenciais, dados financeiros ou `subject_key`.

A consulta inclui versões publicadas e arquivadas para preservar histórico sem confundir os indicadores da versão corrente. Restrição explícita por organização e aluno, associação ao currículo editorial e limite de 5.000 registros (falha conservadora se houver mais, sem exportação enganosa parcial). Cache-Control no-store do middleware e Content-Disposition de anexo. Interface do aluno oferece exportação depois de receber o catálogo autorizado, e apaga/desabilita o controle ao receber 403/419.

Testes Feature sintéticos devem provar segregação A/B, permissão de administrador independente, tentativa de falsificar empresa, histórico arquivado e ausência de dados de identificação no JSON. A funcionalidade não habilita acesso de clientes reais, não representa implementação completa dos direitos LGPD, não define retenção nem permite exclusão de histórico; revisões legais/segurança e Portal #886 seguem bloqueados.
