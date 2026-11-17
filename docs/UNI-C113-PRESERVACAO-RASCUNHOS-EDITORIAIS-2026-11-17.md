# UNI C-113 — preservar rascunhos entre os formulários editoriais

## Defeito reproduzido

Na base `d6d8b77`, curso e aula podiam ter alterações locais simultâneas. Os handlers reais apresentavam duas perdas silenciosas:

- **Salvar o curso:** `refreshCourses()` chamava `refreshLessons()`, que executava `resetLesson()`. O texto ainda não salvo da aula era apagado, sem requisição de gravação da aula nem confirmação de descarte.
- **Salvar ou excluir a aula:** `refreshLessons()` chamava `fillCourse()`. Título, categoria, resumo e ordem ainda não salvos do curso eram substituídos pelos valores anteriores do catálogo.

A reprodução executou os handlers e as funções de atualização extraídos da própria view, com respostas HTTP sintéticas. Não depende de hipótese sobre produção, revisão humana ou autorização Portal.

## Comportamento implementado

`resources/views/university/admin.blade.php` separa o preenchimento dos campos do curso da atualização dos controles de edição. Consultar novamente as aulas altera disponibilidade, lista e seleção sem substituir o formulário do curso.

Quando a aula tem alterações pendentes, **Salvar rascunho** do curso não envia nenhuma requisição. A mensagem orienta salvar a aula primeiro; também informa que **Nova aula** permite descartá-la mediante a confirmação já existente. As alterações do curso permanecem no formulário. O caminho com os dois formulários alterados é:

1. Salvar a aula; a consulta autorizada seguinte mantém os campos do curso.
2. Salvar o curso; a aula já salva pode permanecer selecionada.

Atualizar uma aula mantém sua seleção quando o mesmo ID está presente na lista recém-consultada. Criar uma aula pode selecionar o ID retornado pela gravação, somente se ele também existir na lista validada. Uma aula excluída, substituída por outra versão ou ausente da resposta autorizada não é restaurada na seleção.

Excluir aula conserva a confirmação anterior. Cancelar não envia a exclusão; confirmar exclui apenas a aula selecionada e mantém o rascunho local do curso. A navegação que realmente troca de curso continua sujeita à confirmação de descarte dos formulários.

## Limites preservados

- Não há gravação automática do formulário irmão nem repetição automática de `POST`, `PATCH` ou `DELETE`.
- A barreira de resultado incerto C-101 permanece: falha após gravação congela novas escritas até conferência explícita. Se a consulta de aulas falhar após salvar, os campos locais do curso continuam presentes e bloqueados.
- HTTP 403/419 continua encerrando o acesso e apagando o conteúdo privado. A alteração não guarda cópia para restaurar campos depois de revogação.
- Respostas antigas continuam sujeitas ao token da requisição e ao curso selecionado. A seleção só reaparece a partir da lista autorizada atual.
- Backend, locks, auditoria transacional, compatibilidade do hash opcional para consumidores legados e gates de lançamento permanecem com seus contratos existentes.

## Verificação

`scripts/check-editor-draft-preservation.mjs` executa o código real da view, incluindo o wrapper HTTP, bloqueio de acesso, funções de atualização e handlers. A infraestrutura de teste fornece somente DOM mínimo e servidor sintético.

Os onze cenários locais passaram:

1. Curso e aula alterados: tentar salvar curso não envia requisição e preserva ambos.
2. Salvar aula e depois curso preserva todos os campos do formulário irmão e a seleção.
3. Criar aula mantém o curso e seleciona somente ID presente na lista autorizada.
4. Cancelar exclusão mantém ambos os formulários; confirmar mantém o curso e remove a seleção excluída.
5. Cancelar o descarte da aula mantém os textos; aceitar permite salvar o curso.
6. Atualizar lista mantém uma seleção existente e limpa uma aula removida.
7. Resposta atrasada de outro curso não restaura seleção anterior.
8. HTTP 403 após salvar aula limpa os campos do curso e impede novas escritas.
9. HTTP 200 tardio após revogação não restaura conteúdo privado.
10. Resposta 503 após gravação sinteticamente confirmada preserva os formulários, congela controles e não repete a mutação.
11. Falha na consulta posterior à gravação mantém os campos do curso e a barreira de escrita.

O checker C-111 de diagnóstico de publicação também permanece aprovado nos 35 cenários locais. A execução Chromium e os demais jobs da proposta devem ser registrados pela revisão exata da CI; este documento não antecipa seu resultado.

## Escopo e rastreabilidade

Correção funcional do editor já existente, relacionada a administração de conteúdo e catálogo versionado em [UNI-01](10-modulos/UNI-01.md), [UNI-03](10-modulos/UNI-03.md), [UNI-04](10-modulos/UNI-04.md) e rastreabilidade em [UNI-14](10-modulos/UNI-14.md). Não representa implementação integral desses módulos nem aceite editorial humano.

A PR 83 foi comparada pela revisão `5dbd317d25f232f1667f98315883a64caa8f554f`: a diferença exclusiva contém quatro correções de textos em `content/mvp-cursos-v1.json` e sua prévia offline. C-113 não modifica esses materiais nem duplica esse trabalho.
