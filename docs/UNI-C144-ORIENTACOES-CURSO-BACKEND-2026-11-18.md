# UNI-C144 — Público indicado e conhecimentos sugeridos: backend

**Data:** 18/11/2026. **Base de desenvolvimento:** `92d8452b5cb3e65308a11044747f75d6c77e9cd5`.

## Capacidade aprovada

A [base funcional dos 14 módulos](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md) prevê público por curso em `BASE-UNI-03-01` e pré-requisitos informativos, sem bloqueio acadêmico, em `BASE-UNI-03-05`. O item **Público e contexto** do [template curricular](02-saneamento/UNI-001-proposta-saneada.md) especifica perfil indicado e conhecimentos sugeridos.

Este recorte acrescenta os dois textos opcionais ao cadastro editorial existente. Não representa a implementação integral das seis escolas, nem cria prova, classificação pessoal, elegibilidade comercial ou condição para abrir uma aula autorizada. O conteúdo dos cursos não é preenchido automaticamente; registros existentes passam a ter os campos nulos.

## Dados e compatibilidade

A migration `2026_11_18_000001_add_optional_course_context.php` adiciona duas colunas em `educational_courses`:

| Campo | Tipo | Significado |
|---|---|---|
| `audience` | `varchar(500)`, nullable | Público a quem o curso pode ser útil. |
| `suggested_knowledge` | `varchar(500)`, nullable | Conhecimentos ou familiaridade que podem ajudar na leitura, sem obrigação acadêmica. |

Os campos aceitam texto Unicode de até 500 caracteres cada, conforme a validação de strings do Laravel. O limite é de caracteres, sem redução para 500 bytes ou truncamento. Os testes preparados incluem 500 emojis aceitos e 501 rejeitados.

A migration é aditiva, sem preenchimento ou reclassificação do acervo. O rollback remove somente as duas colunas novas, com seus valores; preserva os campos anteriores, cursos, versões e aulas. Não acrescenta tabela, relacionamento, índice, enum ou permissão de banco.

### Criação e edição

Os endpoints existentes recebem os campos no mesmo payload de metadados:

- `POST /universidade/private/admin/courses`;
- `PATCH /universidade/private/admin/courses/{courseId}`.

As regras novas no controller são `nullable`, `string` e `max:500`, aplicadas separadamente a cada campo. Arrays, objetos, booleanos, números e texto acima do limite são rejeitados com 422. A normalização HTTP já existente de espaços externos e strings vazias permanece; uma entrada composta apenas de espaços chega ao domínio como `null`.

| Entrada do campo | Criação | PATCH |
|---|---|---|
| Campo omitido | Salva `null` | Preserva o valor existente |
| `null` explícito | Salva `null` | Limpa somente esse campo |
| Texto válido | Salva o texto validado | Substitui somente esse campo |

O repositório usa `array_key_exists` em cada campo novo durante o PATCH. Assim, clientes antigos que não conhecem essas propriedades continuam editando o curso sem apagá-las. A omissão de um dos campos também não apaga o outro.

Permanecem os recibos existentes: criação com 201 e `{id,status:"draft"}`; edição com 200 e `{saved:true}`. A exigência dos demais campos, o tratamento de curso inexistente/publicado e a pré-condição opcional `expected_sort_order` continuam com seus contratos anteriores.

Não foi criado um CAS geral de texto. Uma substituição explícita de orientação segue a semântica atual de edição dos metadados; a proteção de ordem continua restrita à ordem. Omitir a orientação evita sua alteração pelo cliente antigo, mas não transforma a edição inteira em comparação de versões.

### Leitura

`adminCourses()` e `catalog()` incluem `audience` e `suggested_knowledge` nos DTOs existentes de cursos, como string ou `null`. Esses campos são adições ao cadastro retornado; não há endpoint novo.

O catálogo do aluno continua limitado a cursos compartilhados do acervo editorial com curso e versão publicados, sob o grant VIEW existente. O texto é editorial e comum aos clientes autorizados; não é calculado por pessoa, empresa, progresso ou contratação de produtos adicionais.

A busca de aulas não passa a pesquisar esses campos. Os exports pessoais de progresso e favoritos não passam a carregá-los. A leitura dessas orientações não grava conclusão, favorito ou posição de leitura.

## Cadastro atual, publicação e hash

Os dois campos pertencem a `educational_courses`, portanto descrevem o **cadastro atual do curso**. Não são copiados para as versões e não compõem um snapshot histórico de público ou conhecimentos sugeridos. As consultas de versões arquivadas permanecem com seus DTOs anteriores; a interface não deve apresentar as orientações atuais como se fossem da versão arquivada.

A edição continua restrita ao curso compartilhado da organização editorial em estado de rascunho. O repositório trava a linha do curso e revalida o grant antes da mutação. A atualização e o evento `course.updated` usam a transação existente; não há evento de orientação separado ou identificação de estudante associada ao texto. Um curso publicado continua exigindo retirada antes de edição.

`publicationHash()` inclui os valores dos dois campos no SHA-256 do cadastro, versão e aulas. O diagnóstico carrega as orientações ao formar `content_hash`; a publicação carrega os mesmos campos na seleção da linha do curso sob `lockForUpdate`, antes da comparação. Uma alteração de público ou conhecimento sugerido após a conferência invalida o hash anterior quando esse hash é enviado ao publicar.

O erro existente nesse caso permanece 409 com `missing_lesson_or_changed_draft`, sem publicar ou registrar um evento de publicação. É necessário realizar uma nova conferência para obter o hash do conteúdo atual. Como o hash é opaco e sua composição mudou, um diagnóstico obtido antes desta atualização também precisa ser renovado; não se promete estabilidade do hash entre versões da aplicação.

A inclusão no hash não torna os campos obrigatórios. A ausência deles não acrescenta erro ou aviso de prontidão, e não bloqueia publicação ou aprendizagem. `null` é representado como texto vazio na composição do hash, seguindo o padrão do resumo opcional.

`expected_content_hash` continua opcional no contrato legado do backend. Esta entrega amplia o conteúdo comparado quando ele é fornecido, sem alterar essa compatibilidade. O hash continua sendo uma conferência de alteração de conteúdo, sem representar aprovação humana ou autorização do Portal.

## Autoridade e limites do recorte

São reutilizados middleware, grants, organização editorial, locks e revalidação existentes. Os campos não concedem nem revogam acesso, não exigem comprovação de conhecimento e não substituem as regras dos produtos Imagine. Orientações sobre planos, permissões ou procedimentos operacionais devem decorrer de documentação oficial; nenhum texto desse tipo foi inventado ou inserido nesta entrega.

Nenhum binding operacional, política de retenção, role de banco, release gate ou workflow foi alterado pelo backend deste recorte. A migration e as mudanças de DTO ainda exigem a integração e validação autorizadas; esta documentação não declara implantação ou preenchimento do acervo.

## Evidência preparada

`tests/Feature/CourseContextFlowTest.php` contém **nove cenários HTTP**, com migrations e repositório reais e apenas a autoridade Portal sintética:

1. Criação legada nula, PATCH legado preservando ambos os campos e ordem já salva, e leitura administrativa.
2. Texto Unicode e conteúdo literal no limite, indisponibilidade do rascunho ao aluno, leitura publicada por duas empresas e abertura de aula sem bloqueio acadêmico ou escrita pessoal.
3. Substituição ou limpeza de um campo preservando o outro, incluindo a normalização de espaços, sem zerar a ordem.
4. Rejeição de tipos inválidos e de 501 caracteres em criação e edição, sem alteração de cursos, versões, aulas, auditoria ou estado pessoal.
5. Participação de cada campo no hash: conferência antiga rejeitada sem efeitos e publicação posterior com conferência atual.
6. Imutabilidade durante publicação, retirada antes de editar e preservação das aulas arquivadas enquanto o cadastro atual muda.
7. Restrições de permissão, empresa editorial e grant revalidado dentro da transação, sem alterações negadas.
8. Busca e exports pessoais sem expansão indevida de payload ou escrita causada pelas orientações.
9. Migration aditiva sobre curso preexistente e rollback preservando os dados anteriores.

`scripts/check-pg-schema.php` acrescenta **uma inspeção somente leitura**, passando de 16 para 17 invariantes de schema: ambas as colunas devem existir, ser `character varying`, ter comprimento máximo 500 e aceitar `NULL`. O probe mantém seu guard de banco sintético e não acrescenta consultas a dados de alunos ou novas credenciais.

O backend recebeu revisão independente de código sem bloqueador concreto. Os nove cenários PHP e a inspeção PostgreSQL estão **preparados, não executados localmente**. Nenhum resultado de CI do incremento C144 é declarado antes da integração. A interface e seus testes são uma frente separada; esta documentação não antecipa seus resultados.

## Arquivos do backend

- [Migration dos campos opcionais](../database/migrations/2026_11_18_000001_add_optional_course_context.php).
- [Controller: validação de criação e edição](../app/Http/Controllers/UniversityController.php).
- [Repositório: cadastro, catálogo e hash de publicação](../app/Domain/Learning/UniversityCatalogRepository.php).
- [Testes HTTP de orientação de curso](../tests/Feature/CourseContextFlowTest.php).
- [Inspeção PostgreSQL do schema](../scripts/check-pg-schema.php).

## Evidência do SHA integrado C144

A execução [Actions 44239547982](https://github.com/rafhael100/imagine-universidade/actions/runs/44239547982), no SHA `33e89a34c6fabc22df63e968a164589caf377479`, concluiu os seis jobs com sucesso: **400 testes PHP / 5.325 asserções** (39 Unit/169 e 361 Feature/5.156), **17 invariantes PostgreSQL**, **837 verificações Chromium sintéticas** e **259 verificações no Laravel real**, com persistência aprovada. Os nove métodos Feature, a verificação das colunas opcionais, os 33 checks sintéticos e os 14 da jornada preparados acima foram executados.

As quatro capturas reais de editor e aluno foram examinadas em desktop e 390 px: campos e rótulos legíveis, texto literal e quebras preservadas, sem transbordamento horizontal. O artefato `14398524869` foi baixado e verificado pelo SHA-256 `9693271925084ed24b2dfa889ab2426a7ef8829380605f4ecacad1d95df84301`. Esse resultado substitui a pendência de runtime descrita na preparação; a PR continua em rascunho e os gates operacionais permanecem `HOLD_NO_GO`/`NOT_VERIFIED`.
