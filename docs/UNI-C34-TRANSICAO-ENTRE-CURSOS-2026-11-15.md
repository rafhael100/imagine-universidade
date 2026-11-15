# UNI C-34 — continuação automática entre cursos

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.**

Quando a última aula pendente de um curso é concluída, a interface continua apresentando o aviso de conclusão daquele curso. Se outro curso publicado ainda tem progresso pendente, também oferece o botão **Continuar em outro curso**. Esse botão leva ao primeiro curso diferente com aulas pendentes, preservando a escolha do usuário e sem expor outros alunos.

As ações "Retomar meus estudos" e "Continuar em outro curso" compartilham a função que restaura filtros e busca e respeita encerramento de acesso 403/419. A seleção usa apenas contadores já fornecidos pelo catálogo autorizado. O curso corrente não é escolhido como seu próprio próximo curso, mesmo quando a lista de progresso ainda não foi atualizada após a conclusão.

Foram adicionados testes Node de função pura para curso já concluído, próximo incompleto, catálogo inexistente, curso atual e bloqueio por revogação. A realização de QA da nova HEAD e um ensaio em navegador ainda são necessários.
