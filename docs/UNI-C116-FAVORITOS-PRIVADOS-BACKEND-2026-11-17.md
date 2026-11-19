# C-116 — favoritos privados por aluno e empresa

17/11/2026 · Backend candidato para revisão e QA. **HOLD_NO_GO** operacional.

## Objetivo e base

Implementar a preferência pessoal prevista em
[UNI-07-02](10-modulos/UNI-07.md) e [UNI-12-01](10-modulos/UNI-12.md), reutilizando
as rotas privadas, a autoridade Portal, o catálogo editorial e as transações
existentes. Não há provedor alternativo de identidade nem lista de preferências
dos funcionários para gestores.

## Contrato HTTP

Todos os caminhos ficam em `/universidade/private`, exigem `university:view` e
usam a empresa e a pessoa do grant verificado no servidor. Nenhuma empresa,
pessoa, permissão ou concessão é obtida do corpo, query string ou header enviado
pelo navegador. As escritas mantêm o middleware web/CSRF existente.

| Método e caminho | Resposta de sucesso | Comportamento |
|---|---|---|
| `GET /favorites` | `{"course_ids":[1,2]}` | IDs inteiros únicos e ordenados dos favoritos próprios que ainda pertencem ao acervo editorial compartilhado, com curso e versão publicados |
| `PUT /courses/{courseId}/favorite` | `{"course_id":1,"favorite":true}` | Exige curso atualmente publicado; repetir a mesma operação preserva um único registro e seus timestamps |
| `DELETE /courses/{courseId}/favorite` | `{"course_id":1,"favorite":false}` | Remove apenas a preferência própria; permite remoção após retirada e devolve o mesmo resultado quando ela já não existe |

A leitura não devolve tenant, pessoa, timestamps, títulos, conteúdo ou registros
alheios. Curso indisponível, privado, pertencente a cliente, sem versão publicada
ou inexistente não pode ser favoritado. O PUT retorna `404 not_found` para essas
condições ou para uma concessão que deixou de coincidir durante a transação.

Negação na entrada retorna `403 access_denied` pelo middleware. A remoção também
retorna 403 se a revalidação interna falhar; um ID não positivo é 404. Falha do
armazenamento retorna `503 temporarily_unavailable`, sem apresentar uma lista
vazia ou confirmação de gravação como se a operação tivesse sido concluída.

Uma retirada concorrente pode fazer um favorito recém-gravado desaparecer da
listagem visível. O cliente deve conciliar os IDs com o catálogo atual. Nenhuma
escrita precisa ser repetida automaticamente após uma resposta incerta.

## Persistência e transações

A tabela `educational_course_favorites` contém somente:

- `educational_organization_id` e `subject_key` do aluno autorizado;
- `educational_course_id` do acervo;
- `created_at` e `updated_at`.

Não existe ID adicional, token, perfil comercial, IP ou conteúdo copiado. O índice
único cobre empresa, pessoa e curso; as duas FKs usam `ON DELETE RESTRICT`.

No PUT, o repositório bloqueia o curso antes da versão publicada, na mesma ordem
usada pela publicação editorial. Depois dos bloqueios e antes do INSERT, a
autoridade é consultada novamente, exigindo a mesma empresa, pessoa, permissão e
revisão. `insertOrIgnore` só confirma uma duplicata quando o registro privado
exato realmente existe.

No DELETE, a consulta inicial é limitada à preferência própria. Se ela não
existe, a autoridade ainda é revalidada dentro da transação e nenhuma consulta ao
curso é necessária. Se existe, somente o ID do curso é bloqueado antes da
revalidação e remoção. Nenhum conteúdo editorial é lido para remover a preferência.

O papel SQL runtime recebe `SELECT`, `INSERT` e `DELETE` nessa tabela. Não recebe
`UPDATE`, DDL ou sequência nova. Repetir um favorito não altera os timestamps.

## Retenção

A [DEC-UNI-P0-05](00-governanca/DECISAO-UNI-P0-05-2026-11-03.md) estabelece 120 dias
**após perda da última elegibilidade**. A criação antiga de um favorito não é
esse evento. Retirar um curso ou revogar acesso também não apaga preferências de
forma imediata; uma republicação pode voltar a exibir o favorito para o mesmo
aluno elegível.

Esta entrega não inventa um relógio de perda de elegibilidade nem um expurgo
automático. A contagem operacional depende da fonte oficial do Portal e da
homologação da política de retenção. A remoção expressamente solicitada pelo
próprio aluno continua disponível enquanto houver grant válido.

## Verificação

`FavoriteCoursesFlowTest` prepara 14 testes Laravel com a migração e os endpoints
reais: isolamento entre empresas/pessoas, tentativa de forjar contexto,
idempotência, publicação/retirada/republicação, ausência de acesso de gestor,
negação padrão, revogação durante leitura e escrita, revalidação exata, schema
mínimo, duplicidade e armazenamento indisponível.

O novo `scripts/check-pg-favorites.php` carrega o repositório Laravel real no
PostgreSQL descartável. Uma segunda conexão usa timeout e SQLSTATE 55P03 para
comprovar que curso e versão permanecem bloqueados durante a revalidação. Também
confere a restrição única, as chaves privadas e a remoção de curso retirado. Os
registros de teste são eliminados em ordem de dependência.

**Ordem do laboratório:** executar após migrations e antes de importar o acervo
sintético. O script recusa a presença prévia da organização editorial para não
sobrescrever registros existentes. O contexto de banco é fixado ao laboratório
local da CI; não há execução autorizada em outro banco.

Os verificadores PostgreSQL existentes também foram ampliados: schema com duas
FKs, índice triplo e cinco colunas; matriz de 20 permissões runtime, incluindo
negação efetiva de UPDATE dos favoritos.

Validações locais executadas:

```sh
node scripts/check-write-fence.mjs
node scripts/check-ui-contract.mjs
git diff --check
```

As três passaram. PHP/PHPUnit/PostgreSQL não foram executados localmente e
dependem da CI. O binding real continua `UnavailablePortalAuthority`; nenhum
gate operacional foi alterado.

## Interface integrada do aluno

A biblioteca oferece o filtro **Somente favoritos**, combinado com categoria e
busca, e uma ação separada para salvar/remover o curso selecionado. A lista de
preferências carrega independentemente do catálogo; uma falha não bloqueia a
leitura, a ajuda contextual ou o progresso. Apenas IDs do catálogo atualmente
autorizado aparecem na interface.

O estado visual muda somente após recibo válido com o curso e o booleano
solicitados. Resposta perdida ou inválida inicia uma consulta de reconciliação,
sem repetir a gravação. Se não for possível confirmar o resultado, novas
alterações ficam bloqueadas até consulta manual. Trocas incompatíveis de
seleção e revogação impedem restauração por respostas antigas.

O checker da view executa **50 cenários** com as funções reais. O módulo Chromium
adiciona **33 verificações**, incluindo filtro vazio legítimo, gravação sem
identidade no corpo, resposta ambígua, seleção alterada, recuperação e
PUT 404 seguido de GET 403. Nenhuma dessas ações registra conclusão de aula.
