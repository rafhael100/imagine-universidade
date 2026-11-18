# C137 — preservar a ordem na edição de cursos

Referência: rodada de desenvolvimento de **17/11/2026**. Implementação e verificações locais em **18/11/2026**.

Base de trabalho: `3894f10715be4d52a9a3d4d946cc9923617e05f5`, no worktree C137. Esta identificação não afirma aprovação desta entrega na CI.

## Lacuna concreta

Na base, `UniversityCatalogRepository::updateCourse()` travava o curso com `first(['id'])` e sempre incluía no UPDATE:

~~~php
'sort_order' => $input['sort_order'] ?? 0,
~~~

Assim, um PATCH válido de título, categoria e resumo, sem `sort_order`, substituía uma ordem existente de `7` por `0`. O lock serializava as escritas, mas não preservava o campo omitido. O primeiro teste focal registra essa regressão com uma ordem inicial não nula e exige sua preservação.

Havia também o mesmo problema de intenção já tratado nas aulas pela C133: um editor que havia lido a ordem `7` podia reenviá-la junto do texto depois de outra sessão confirmar a ordem `80`. O formulário da base incluía `sort_order` em todo PATCH. A serialização, sozinha, não permite distinguir essa posição antiga de uma decisão explícita de mover o curso.

A evidência do backend nesta rodada é a leitura do caminho real na base e os testes de regressão preparados contra HTTP, migrations e repository reais. Não houve execução PHP local. A reprodução e a alteração do formulário pertencem à entrega de interface C137, separada deste diff.

O autor da interface registrou também uma reprodução anterior à correção, na mesma base, com duas VMs executando o script inteiro e os handlers reais. A sessão B confirmou ordem `5`; a sessão A ainda tinha baseline `0` e alterou somente o resumo. Seu PATCH incluiu `sort_order: 0`, e a fixture HTTP compartilhada terminou novamente em zero. Essa execução demonstra o reenvio incorreto pelo formulário; não é apresentada como ensaio dos locks ou do UPDATE SQL. O checker de UI corrigido exige omissão nesse cenário e conflito quando a ordem antiga é alterada explicitamente.

## Contrato do PATCH

O endpoint continua `PATCH /universidade/private/admin/courses/{courseId}`. Título, categoria, resumo, receipt e escopo editorial conservam seus contratos.

| Campos de ordem recebidos | Resultado |
| --- | --- |
| Sem `sort_order` e sem `expected_sort_order` | Edita os metadados e preserva a ordem atual do banco. |
| `sort_order`, sem `expected_sort_order` | Conserva a edição explícita legada e sua validação anterior. |
| Ambos, como inteiros JSON de `0` a `9999`, com esperado igual ao valor atual | Salva o destino e os metadados na mesma transação. |
| Ambos válidos, mas esperado diferente do valor atual | Rejeita a operação inteira com `409 {"error":"draft_order_changed"}`, após revalidar a autoridade. |
| `expected_sort_order` presente, sem destino ou com qualquer um dos dois valores mal tipado/fora da faixa | `422 {"error":"invalid_order"}`, sem escrita. |

O novo caminho com pré-condição exige um **par estrito**: não converte strings numéricas, booleanos, nulos, arrays nem números fracionários. Um literal JSON `0.0` também não satisfaz a exigência de inteiro do PHP. O domínio aplica a mesma restrição a chamadas diretas e devolve `false` para um par inválido.

O caminho legado sem `expected_sort_order` conserva a validação anterior do controller, inclusive strings numéricas aceitas pela regra `integer`. Chamadores existentes não são obrigados a aderir à nova pré-condição. O contrato de criação não muda: `POST /courses` continua usando zero quando a ordem é omitida.

O sucesso permanece `200 {"saved":true}`. O retorno `false` do repository conserva o resultado HTTP existente, `404 {"error":"not_found_or_published"}`. Não foram acrescentados campos ao recibo nem criados endpoints.

## Atomicidade e autorização

`updateCourse(): bool` mantém o tipo de retorno. O conflito usa a exceção específica `EditorialCourseOrderConflict`, lançada dentro da transação, antes do UPDATE e da auditoria. Não retorna uma string de erro que possa ser interpretada como sucesso booleano.

A sequência é:

1. Validar o par opcional no limite do domínio.
2. Resolver a organização editorial pelo grant, sem aceitar identidade ou organização do payload.
3. Travar a linha do curso compartilhado, da organização editorial e ainda não publicado, lendo também sua ordem atual.
4. Revalidar o grant dentro da transação, depois da trava e antes de comparar ou gravar.
5. Comparar `expected_sort_order` com o valor atual, quando fornecido.
6. Atualizar os metadados; incluir `sort_order` somente se o campo foi enviado.
7. Gravar `course.updated` na mesma transação.

Essa é a mesma linha travada por publicação, retirada e demais escritas editoriais. A alteração não cria uma segunda ordem de locks.

O controller captura somente `EditorialCourseOrderConflict`. Antes de liberar o `409`, consulta novamente a autoridade e exige a mesma pessoa, organização, permissão e revisão. Se a decisão mudou ou está indisponível, devolve `403 {"error":"access_denied"}` sem expor o conflito.

O caminho de sucesso não ganhou uma revalidação depois do commit, que poderia apresentar uma escrita já confirmada como rejeitada. As verificações existentes antes da mutação permanecem. Falhas inesperadas não são convertidas em um conflito de ordem.

O middleware de sessão, a capacidade MANAGE, o CSRF e os cabeçalhos privados permanecem intactos. Um curso publicado, estrangeiro, não compartilhado ou inexistente não revela sua ordem por esse novo erro.

## Alcance da pré-condição

A comparação protege **o valor atual de ordem daquele curso**. Não é uma revisão geral do formulário, um CAS de título/resumo/categoria ou uma comparação da ordem de todo o catálogo. A edição de outro curso não invalida a pré-condição.

Uma sequência que altere a ordem e depois a devolva ao mesmo valor satisfaz a comparação. Não há contador de revisão, registro de intenção nem proteção contra esse ciclo por esta entrega. Chamadores legados que enviam uma ordem explícita sem esperado continuam sem essa proteção, por compatibilidade.

Mesmo quando o destino solicitado já coincide com o banco, um esperado divergente continua sendo conflito. O PATCH também carrega metadados; aceitá-lo como repetição idempotente poderia reaplicar um texto antigo. Não há replay ou tentativa automática no backend.

A interface C137 pode omitir a ordem quando o campo não mudou e enviar o baseline somente ao mover explicitamente. Esse comportamento é desenvolvido e verificado na entrega de UI. A validação de `saved === true` da C136 deve ser conservada.

O título, resumo e categoria editados são cadastro atual do curso. Esta alteração não converte esses campos em snapshot histórico. Após uma retirada válida, o curso pode voltar a ser editado como já ocorria, preservando versões e aulas arquivadas.

## Testes Feature preparados

`tests/Feature/EditorialCourseOrderEditFlowTest.php` prepara **23 testes** com SQLite, migrations, rotas, middleware e repository reais. Somente a autoridade Portal é sintética.

Os cenários cobrem:

- Ordem não nula preservada ao omitir o campo; edição textual posterior a uma posição confirmada por outra requisição.
- Criação com default zero, valores explícitos legados e extremos válidos `0`/`9999`.
- Conflito sem alteração de título, resumo, categoria, ordem, timestamp, versões, aulas ou auditoria; destino já igual não permite replay.
- Pré-condição limitada ao curso selecionado; alteração de outro curso continua compatível.
- Valores esperados/destinos ausentes, nulos, strings, booleanos, arrays, fracionários e fora da faixa, incluindo `0.0`/`1.0` enviados como JSON real com fração preservada.
- Mesmo limite nas chamadas diretas, retorno booleano e exceção tipada.
- Grant ausente, revogado, expirado, indisponível ou com organização, pessoa, permissão ou revisão diferente.
- Curso estrangeiro, não compartilhado, publicado e inexistente; aluno, gestor de empresa cliente e sessão inválida; campos forjados sem poder de alterar escopo ou publicação.
- Publicação/retirada reais seguidas de edição do cadastro, preservando versões e aulas; CSRF real obrigatório.
- Revogação durante a leitura travada, revalidação antes do conflito e manutenção do receipt após sucesso confirmado.
- Exceções depois do UPDATE ou da inserção de auditoria, com rollback integral.

Esses testes foram escritos e revisados, mas não executados localmente. A execução PHP pertence à CI autorizada.

## Extensão PostgreSQL preparada

`scripts/check-pg-lesson-reorder.php` recebe **11 verificações adicionais** depois dos cenários C133. Reutiliza os cursos, versões, aulas, IDs capturados e as duas conexões existentes. Não acrescenta fixture persistente nem altera o cleanup.

O probe prepara uma leitura anterior pela sessão independente e confirma uma nova ordem pelo repository. Em seguida verifica:

- PATCH sem ordem preservando a posição confirmada.
- Revalidação dentro da transação que mantém o lock do curso.
- Contenção real de outro PATCH de curso e de uma publicação, com `55P03` e os limites de espera existentes.
- Commit de uma pré-condição válida na sessão independente depois da liberação da trava.
- Dois conflitos de baseline antigo, inclusive destino já igual, sem alterações ou transação pendente.
- Compatibilidade legada, rejeição de pares inválidos, negação ao vivo e isolamento de cursos estrangeiros/não compartilhados.
- Rollback depois da inserção de auditoria.
- Exatamente quatro eventos `course.updated` das quatro edições confirmadas; publicação, versões, aulas e outros cursos íntegros.

Permanecem as guardas de GitHub Actions, repositório, ambiente e banco descartável, as conexões loopback, os timeouts e a limpeza por IDs próprios. As falhas imprimem apenas etapa e classe; não imprimem SQL, credenciais ou payloads. Nenhum flag de CI foi simulado e nenhum PostgreSQL local foi iniciado ou consultado.

## Verificação local e arquivos

Executado:

- `node scripts/check-write-fence.mjs` — **PASS**, verificação estática dos 15 caminhos HTTP de escrita e suas barreiras de autoridade.
- `git diff --check` — **PASS**.

Não executado localmente: PHP, PHPUnit, PostgreSQL, aplicação, servidor ou navegador. Os 23 Feature e 11 checks PG são cobertura preparada para CI, sem alegação de aprovação em runtime.

Arquivos desta entrega:

1. `app/Domain/Learning/UniversityCatalogRepository.php` — somente `updateCourse` e sua documentação de tipo.
2. `app/Http/Controllers/UniversityController.php` — somente `updateCourse` e import da exceção.
3. `app/Domain/Learning/EditorialCourseOrderConflict.php` — exceção tipada.
4. `tests/Feature/EditorialCourseOrderEditFlowTest.php` — regressões HTTP/domínio.
5. `scripts/check-pg-lesson-reorder.php` — extensão focal sobre as conexões existentes.
6. Este documento.

Não foram alterados a view, rotas, schema, grants, workflows, runners ou a política de retenção. Não foram feitos stage, commit ou push nesta worktree.
