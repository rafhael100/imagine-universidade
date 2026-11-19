# C-118 — exportação dos favoritos privados

17/11/2026 · Backend candidato para revisão e QA. **HOLD_NO_GO** operacional.

## Objetivo e escopo

Permitir que o aluno exporte as próprias referências salvas na empresa
atualmente autorizada. A entrega usa as preferências da
[C-116](UNI-C116-FAVORITOS-PRIVADOS-BACKEND-2026-11-17.md) e a mesma fronteira de
autorização da exportação de progresso, mantendo arquivos e contratos separados.

A capacidade corresponde à área pessoal e à exportação previstas em
[UNI-07](10-modulos/UNI-07.md) e [UNI-12](10-modulos/UNI-12.md). O endpoint privado
exige elegibilidade atual; o canal de direitos após cancelamento previsto na
[DEC-UNI-P0-05](00-governanca/DECISAO-UNI-P0-05-2026-11-03.md) continua sendo uma
responsabilidade independente.

## Contrato HTTP

`GET /universidade/private/favorites/export` exige `university:view` a partir da
sessão verificada no servidor. A resposta 200 tem exatamente este formato:

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "favorites": [
    {
      "course_slug": "curso-exemplo",
      "saved_at": "2026-11-17 10:00:00"
    }
  ]
}
```

O download usa `Content-Disposition: attachment` com o nome
`imagine-universidade-favoritos.json`. As respostas mantêm a política privada de
`no-store`, não indexação e segurança já aplicada às rotas da Universidade.

| Campo | Significado |
|---|---|
| `schema_version` | Versão 1 do contrato de exportação dos favoritos |
| `scope` | Preferências da pessoa autenticada na empresa atualmente autorizada |
| `favorites` | Lista completa, podendo ser vazia, limitada a 5.000 referências |
| `course_slug` | Referência do curso editorial compartilhado associado à preferência própria |
| `saved_at` | Data de criação da preferência, como string do armazenamento existente |

Não há IDs internos, nome de pessoa, empresa, identidade do grant, títulos,
resumos, aulas ou conteúdo. Parâmetros de query string e headers que aleguem
outra pessoa ou empresa não mudam o escopo. Gestores com `university:manage`
não recebem uma exportação das preferências dos alunos.

`saved_at` conserva a criação original quando o PUT de favorito é repetido.
Remover e salvar novamente cria outra preferência. Essa data não é a perda da
última elegibilidade e não inicia o prazo de retenção.

## Referências após retirada editorial

A biblioteca de favoritos continua mostrando somente cursos atualmente
publicados. A exportação pode incluir uma referência própria retida de curso
retirado, desde que o curso permaneça no acervo editorial compartilhado e exista
uma versão `published` ou `archived`.

A consulta usa `whereExists` para a versão. Um curso com várias versões
arquivadas continua aparecendo uma única vez. Uma linha indevida de favorito em
um curso que nunca foi publicado não permite exportar o rascunho. Cursos de
outros proprietários ou que não sejam compartilhados também ficam excluídos.

A referência retida não autoriza leitura da aula antiga. Após retirada, o
endpoint da aula continua retornando 404; a exportação contém somente a
preferência pessoal. A remoção expressa do favorito pelo próprio aluno elimina
a referência da exportação.

## Consulta, revalidação e falhas

A consulta filtra a organização e `subject_key` do grant, exige o proprietário
editorial canônico e seleciona somente slug e data da preferência. A ordenação
é estável pelo curso associado, sem incluir seu ID no JSON. São lidas no máximo
5.001 linhas para distinguir uma exportação completa do excesso de volume.

| Condição | Resposta |
|---|---|
| Nenhum favorito exportável | 200, `favorites: []` |
| Até 5.000 favoritos exportáveis | 200, arquivo completo |
| Mais de 5.000 | 503 `temporarily_unavailable`, sem arquivo parcial |
| Falha da consulta ou contexto de armazenamento indisponível | 503 `temporarily_unavailable`, sem fingir uma lista vazia |
| Grant ausente, revogado, incompatível ou autoridade indisponível | 403 `access_denied`, sem download |

O repositório recusa grants expirados ou de outra permissão. Depois da leitura,
o controller consulta novamente a autoridade e compara empresa, pessoa,
permissão e revisão. O middleware GET faz sua própria revalidação antes de
liberar a resposta, incluindo uma revogação ocorrida depois do refresh do
controller.

Essa operação é somente leitura. Não altera favoritos, progresso, auditoria ou
datas. Não exige migração, índice, papel SQL ou permissão nova: os SELECTs
necessários já pertencem ao runtime. O endpoint e o arquivo de progresso mantêm
seu contrato anterior.

## Verificação preparada

`tests/Feature/FavoritesExportFlowTest.php` acrescenta 16 testes com Laravel,
migrações e consultas reais, usando apenas decisões de autoridade sintéticas:

- Lista vazia versionada, nome do arquivo e headers privados.
- Isolamento da mesma pessoa entre duas empresas e de colegas na mesma empresa;
  query strings, headers, sessão forjada, editor e gestor não ampliam o acesso.
- Provider normal deny-all e rejeição defensiva de grants inválidos no repositório.
- Data original conservada por escrita idempotente, inclusive com favorito
  criado há mais de 120 dias e elegibilidade ainda válida.
- Retirada, aula antiga indisponível, referência pessoal retida, remoção própria
  e ausência de duplicatas após múltiplas versões editoriais.
- Exclusão de curso privado, de outro proprietário ou nunca publicado, mesmo
  com preferência indevida previamente inserida.
- Exportação de progresso preservada e ausência de alterações nos registros.
- Limite de 5.001 recusado integralmente e exportação de 5.000 aceita; a fixture
  de volume usa lotes pequenos no SQLite real.
- Erro de banco, revogação durante a consulta, indisponibilidade da autoridade,
  mudança de identidade/permissão/revisão e revogação na revalidação final GET.

Validações locais executadas: `node scripts/check-write-fence.mjs` e
`git diff --check`, ambas aprovadas. PHP/PHPUnit e banco real devem ser
executados na CI; nenhum resultado desses testes foi presumido localmente.

O binding de produção continua `UnavailablePortalAuthority`. A entrega não
antecipa a homologação SSO/Portal nem altera gates operacionais ou a política de
retenção de 120 dias após perda da última elegibilidade.
