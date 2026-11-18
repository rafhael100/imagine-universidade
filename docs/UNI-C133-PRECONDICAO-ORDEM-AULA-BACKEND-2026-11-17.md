# C133 — preservação e pré-condição da ordem no PATCH de aula

Referência: rodada de desenvolvimento de **17/11/2026**. Base desta implementação:
**1d439bd**. Preparação e verificação estática local em 18/11/2026; nenhum PHP,
PostgreSQL ou navegador foi executado localmente.

## Problema concreto

A C129 compara a lista completa e grava um movimento de aulas dentro de uma
transação. O formulário anterior de edição, porém, sempre enviava sort_order
junto com título e corpo. O PATCH não distinguia uma ordem deliberadamente
alterada de um valor antigo apenas reenviado.

O caso pode ocorrer mesmo com os locks funcionando:

1. O editor A lê as aulas 11 e 12 nas posições numéricas 0 e 1.
2. B usa a reordenação e confirma a aula 12 na posição 0 e a 11 na posição 1.
3. A altera somente o texto da aula 11, mas envia a antiga ordem 0 junto com o
   conteúdo.
4. O PATCH grava as duas aulas com ordem 0. O desempate por ID devolve a aula
   11 à frente.

Omitir o campo apenas na interface não bastaria: o repositório também usava
zero como default no PATCH. A correção precisa preservar o valor no servidor
quando a ordem não faz parte da intenção.

O recorte desenvolve a edição e a evolução editorial previstas em
BASE-UNI-01-04 e BASE-UNI-03-06 da
[base funcional aprovada](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md).
Não cria uma revisão geral de conteúdo ou nova condição de publicação.

## Contrato HTTP

A rota existente continua sendo:

~~~text
PATCH /universidade/private/admin/lessons/{lessonId}
~~~

Título e corpo continuam sujeitos às regras anteriores. Os campos de ordem
passam a ter este comportamento:

| Campos recebidos | Comportamento |
| --- | --- |
| Sem sort_order e sem expected_sort_order | Edita o conteúdo e preserva a ordem atual no banco |
| sort_order, sem expected_sort_order | Aplica o pedido explícito legado, sem CAS |
| sort_order e expected_sort_order válidos | Exige o par de inteiros JSON e compara a ordem atual com a esperada sob o lock do curso antes de gravar |
| expected_sort_order sem sort_order | Rejeita com 422; não ignora a pré-condição |
| expected_sort_order ou seu sort_order associado inválido | Rejeita com 422; não converte nem ignora a pré-condição ou o destino |

Quando o novo **expected_sort_order** está presente, os dois campos do par
exigem inteiros JSON entre **0 e 9999**, incluindo zero. Strings numéricas,
booleanos, null, arrays e números fracionários não são aceitos em nenhum dos
dois. Sem expected_sort_order, a validação anterior de sort_order permanece,
incluindo seus formatos numéricos legados. O novo campo não é obrigatório.

Exemplo de alteração explícita:

~~~json
{
  "title": "Título revisado",
  "body": "Conteúdo revisado por uma ação editorial explícita.",
  "sort_order": 4,
  "expected_sort_order": 1
}
~~~

| Resultado | Resposta |
| --- | --- |
| Gravação confirmada | 200, objeto com saved igual a true, sem novo recibo ou snapshot |
| Ordem corrente diferente da esperada | 409, error igual a draft_order_changed |
| Novo par malformado ou sem destino | 422, error igual a invalid_order |
| Demais campos inválidos | 422 pelo validador preexistente |
| Curso/aula indisponível para edição | Tratamento booleano legado: 404, not_found_or_published |
| Autoridade perdida antes de liberar o novo conflito | 403, access_denied |

O grupo de rotas, sessão, CSRF, autorização MANAGE e respostas privadas
no-store permanecem existentes. Nenhum endpoint foi acrescentado.

O POST de criação continua usando ordem zero quando o campo está ausente.
A mudança de ausência para “preservar” aplica-se ao PATCH de aula; não altera
criação, edição de curso ou a operação C129.

## Comparação, locks e contrato booleano

UniversityCatalogRepository::updateLesson() continua declarado com retorno
**bool**. Não retorna texto de erro, evitando que uma string verdadeira em
contexto booleano escape pelo antigo caminho de sucesso.

A divergência usa a nova exceção de domínio **EditorialLessonOrderConflict**.
A sequência dentro do repositório é:

1. Rejeitar a forma inválida do novo par também para chamadas diretas.
   Esse caminho devolve false sem gravar; o controller rejeita essas entradas
   HTTP com 422 antes de chamar o repositório.
2. Resolver o curso no escopo editorial compartilhado e obter seu lock
   FOR UPDATE, como nas demais escritas editoriais.
3. Ler a aula de rascunho com ID e ordem, depois de obter o lock.
4. Revalidar o grant com freshWriteGrantMatches, dentro da transação e antes
   da primeira mutação.
5. Quando a pré-condição existe, normalizar a ordem armazenada pelo validador
   inteiro já usado em C129 e comparar com o inteiro esperado.
6. Se houver divergência, lançar a exceção antes do UPDATE e da auditoria.
7. Caso contrário, gravar título e corpo; incluir sort_order no mapa de UPDATE
   somente se o pedido contiver o campo. Registrar lesson.updated pelo caminho
   existente.

O lock do curso é o mesmo primeiro lock usado pela reordenação. Ele permanece
até o término da transação: comparação e UPDATE não ficam separados por uma
janela em que outra escrita editorial possa reordenar o mesmo curso. Não foi
necessário um novo lock de organização, schema, coluna, token persistente ou grant.

O controller captura apenas a exceção de conflito. Como esse caminho não
confirmou uma escrita, revalida o grant antes de liberar 409; mudança de
identidade, vínculo, revisão ou elegibilidade produz 403. O sucesso confirmado
não ganha uma revalidação depois do commit que poderia relatar falha após
gravação. Os retornos false anteriores conservam sua semântica.

Uma exceção no UPDATE ou depois da inserção da auditoria permanece dentro de
DB::transaction: conteúdo, ordem, timestamp e auditoria voltam juntos. O
conflito de pré-condição ocorre antes de qualquer um desses registros.

## Limites deliberados

Esta é uma comparação opcional **da ordem da própria aula**, não do conjunto
inteiro nem de título/corpo. Uma mudança em outra aula, sem mudar o número desta,
não faz a comparação falhar. Uma ordem que mudou e voltou ao mesmo valor é
indistinguível de uma ordem que permaneceu igual; não foi criado histórico de
revisão para essa finalidade.

Pedidos legados que enviam sort_order sem o campo esperado continuam podendo
sobrescrever uma ordem concorrente. A proteção dos formulários novos depende
de omitir o campo que não mudou e enviar a pré-condição quando houver uma
alteração numérica explícita. Isso mantém os pedidos anteriores sem afirmar
que todos eles receberam CAS.

Se o valor esperado divergir, um destino já igual ao estado atual **não**
autoriza repetir o PATCH. A requisição também carrega conteúdo; aceitá-la só
pela ordem de destino poderia reaplicar título ou corpo antigo. O cliente
continua sem replay automático e usa a recuperação manual existente.

## Arquivos e integração

- **app/Domain/Learning/UniversityCatalogRepository.php**: preservação da ordem
  omitida e comparação opcional no método booleano existente.
- **app/Domain/Learning/EditorialLessonOrderConflict.php**: exceção tipada,
  sem conteúdo ou valores atuais no erro.
- **app/Http/Controllers/UniversityController.php**: validação do novo campo e
  conversão do conflito para 409/403.
- **tests/Feature/EditorialLessonOrderEditFlowTest.php**: 21 métodos de teste
  com HTTP, migrations, repositório e transações reais; autoridade sintética.
- **scripts/check-pg-lesson-reorder.php**: extensão do probe C129 já chamado
  pela CI, reutilizando suas fixtures, duas conexões e cleanup.

A interface e seus testes são preparados em um worktree separado. O contrato
para integração é capturar ID/ordem do baseline antes de beginWrite, omitir
ordem numericamente intacta e enviar os dois campos somente ao alterá-la.
O recibo existente precisa confirmar saved: true antes do refresh autorizado.
Conflito ou resposta incerta conserva os campos e a suspensão de escrita
existentes, sem consulta preventiva ou repetição automática.

## Verificação e evidência

Executado localmente:

- node scripts/check-write-fence.mjs: **PASS nos 15 caminhos de escrita**.
- git diff --check: PASS.

Os **21 testes Feature estão preparados, não executados localmente**. Cobrem
ordem omitida não nula, texto salvo após reordenação real, criação com default
zero, pedido legado explícito, extremos da pré-condição, conflito com snapshot
integral inalterado, destino já aplicado, escopo escalar, payloads inválidos,
defesa direta do domínio, retorno booleano, falta de grant fresco, isolamento
editorial, curso publicado/arquivo, CSRF, revogação, revisão do grant, ausência
de revalidação após commit e rollback após UPDATE/auditoria.

A extensão PostgreSQL prepara **9 verificações adicionais** depois de todas as
asserções C129 anteriores. Executa uma reordenação real e edita texto sem
ordem, confirma o lock do curso e a espera de uma reordenação pelo peer, testa
CAS válido, dois conflitos, pedido legado, pré-condição inválida, falta de
destino, destino mal tipado, negação e rollback após auditoria. As fixtures descartáveis e seus
IDs de cleanup permanecem os mesmos. Prazos e guards do laboratório não foram
relaxados. Os diagnósticos não imprimem SQL, payloads ou credenciais.

PHP, PostgreSQL, Chromium e os percursos integrados dependem dos jobs existentes
de CI. Esta entrega não atribui execução desses ambientes aos checks estáticos
acima.
