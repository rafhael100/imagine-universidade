# UNI C-21 — retomada na próxima aula pendente

**15/11/2026 · desenvolvimento em revisão · DRAFT / NO-MERGE / NO-DEPLOY.**

## Entrega ao aluno
Ao abrir um curso já iniciado, a Universidade apresenta primeiro a aula ainda **não concluída**. Se todas estiverem concluídas, abre a última aula para revisão, sem inventar novas tarefas, provas ou certificados.

A lista de aulas recebe do backend o indicador `completed` (inteiro 0/1), calculado por `LEFT JOIN` com `educational_lesson_progress` limitado por `educational_organization_id`, `subject_key` e versão atualmente publicada. Nenhum ID de progresso ou dado de outro aluno é retornado.

A tela informa **Pendente** ou **✓ Concluída**, com texto acessível; após confirmação de conclusão, atualiza o status visual e o resumo do curso. A alteração é orientada pela API, sem armazenar histórico no navegador.

## Segurança e versão
- Permissão `university:view` e sessão verificada no servidor continuam obrigatórias; nenhum ID do navegador define empresa ou aluno.
- A versão despublicada fica arquivada com histórico preservado, mas não marca automaticamente como concluída uma aula da nova versão.
- O provider real `UnavailablePortalAuthority` permanece **deny-all** até o Portal comprovar sessão, elegibilidade contratual e revogação.

## Testes adicionados
- Aluno A vê `completed=1` em aula concluída, aluno B vê `completed=0` na mesma aula e mesmo acervo publicado.
- Após despublicar/republicar, a nova aula mantém `completed=0` sem destruir o histórico anterior.
- No manifesto de três cursos e oito aulas, uma conclusão no primeiro curso marca somente aquela aula; os demais indicadores permanecem pendentes.
- Verificador Node confirma seleção da primeira aula pendente e atualização textual do status.

Executar PHP8.3, Unit/Feature, Node UI e PostgreSQL18 no workflow isolado; não reivindicar homologação até examinar o resultado.

**Sem nova venda, grant, login, deploy ou despesa externa.**
