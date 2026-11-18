# C-121 — marcador privado de leitura

17/11/2026 · Backend candidato para revisão e CI. **HOLD_NO_GO** operacional.

## Objetivo e limites

Guardar uma única aula para retomar, por pessoa e empresa, mediante uma ação
expressa. A referência fixa a aula e a versão efetivamente escolhidas. Abrir,
buscar, ler, rolar ou concluir uma aula não grava nem move o marcador.

A capacidade vem de [UNI-07-02](10-modulos/UNI-07.md) e
[UNI-12-01](10-modulos/UNI-12.md). Reutiliza o grant, a sessão, o CSRF, a fronteira
de respostas privadas e o acervo compartilhado existentes. Não acrescenta
integração Portal, autorização por token, rastreamento de navegação, histórico
de posições, avaliação, conclusão automática ou consulta de alunos por gestores.

## Contrato HTTP

Base `/universidade/private`, permissão `university:view` e identidade obtida
exclusivamente do grant verificado no backend. Escritas continuam sob o grupo
web com CSRF; a revisão de concorrência não substitui nenhuma dessas guardas.

| Método e rota | Entrada | Sucesso |
|---|---|---|
| `GET /reading-position` | Nenhuma identidade ou filtro | Snapshot privado abaixo; nenhuma escrita na tabela do marcador |
| `PUT /reading-position` | `course_id`, `course_version`, `lesson_id`, `expected_revision` | Snapshot `available` da referência exata salva, com nova revisão |
| `DELETE /reading-position` | `expected_revision` | Snapshot `none`, com nova revisão; limpa referência e data, preservando o slot |
| `GET /reading-position/export` | Nenhuma identidade ou filtro | Arquivo v1 da única referência própria exportável, ou `null` |

Snapshot de posição disponível:

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "status": "available",
  "revision": "<string opaca>",
  "position": {
    "course_id": 10,
    "course_version": 2,
    "lesson_id": 25,
    "saved_at": "2026-11-17T10:00:00Z"
  }
}
```

Os estados `none` e `unavailable` mantêm exatamente o mesmo envelope, com
`position: null`. `none` significa ausência de referência guardada;
`unavailable` significa que a referência própria permanece conservada, mas não
pode ser retomada sob o estado editorial atual. Neste caso, o snapshot libera
somente a revisão necessária à substituição ou remoção, sem IDs navegáveis,
título, resumo ou conteúdo retirado.

`revision` é sempre uma string opaca não vazia, com até **2.048 caracteres**.
O cliente guarda a string apenas em memória e a devolve em `expected_revision`.
O PUT exige IDs positivos e seguros para JavaScript; o servidor confere que
curso, número da versão e aula designam a mesma referência publicada.

Cada PUT confirmado gira a revisão, inclusive quando a aula escolhida já era
aquela guardada. `saved_at` representa essa ação explícita e é devolvido em UTC,
no formato `YYYY-MM-DDTHH:MM:SSZ`, em GET, PUT e exportação. A representação
`timestamptz` do PostgreSQL, inclusive offsets como `+00`, é normalizada antes
de sair da API. Cada DELETE de slot
existente também gira a revisão, inclusive se o slot já estiver vazio. Repetir
uma requisição com revisão antiga produz conflito e não altera a preferência.
DELETE sem slot existente produz conflito, sem criar estado. A interface não
oferece remoção quando nenhuma posição está guardada.

| Condição | Código e corpo |
|---|---|
| Revisão antiga, ticket expirado/alterado, escopo incompatível ou slot inexistente para token de linha | `409 {"error":"reading_position_changed"}` |
| Aula/curso/versão incompatível, privado, de outro proprietário, rascunho ou indisponível | `404 {"error":"not_found"}` |
| Grant revogado, incompatível ou autoridade indisponível na revalidação | `403 {"error":"access_denied"}` |
| Sessão/CSRF recusado | `419` do middleware existente |
| Campos ausentes, formato ou limites inválidos | `422` da validação Laravel |
| Banco, contexto de armazenamento ou infraestrutura criptográfica indisponível | `503 {"error":"temporarily_unavailable"}` |

Conflitos não incluem uma cópia do estado atual. O cliente deve consultar e
exigir nova ação antes de substituir. Resposta incerta pode ser reconciliada por
GET, sem repetir a escrita. O recibo descreve a transação concluída; não reserva
acesso editorial futuro. A retomada faz uma leitura autorizada atual da aula.

## Concorrência sem escrita em GET

Uma fila de ações no navegador não coordena outras abas ou sessões. Por isso,
as alterações usam comparação de revisão também no banco, vinculada à chave
empresa/pessoa. A revisão persistida tem prefixo interno `r1.` seguido de 32
bytes aleatórios representados em hexadecimal. O cliente não interpreta isso.
Um contador reiniciado em 1 após recriação não forneceria a mesma proteção.

Antes do primeiro salvamento ainda não há linha para comparar. O GET emite um
ticket de ausência, prefixo interno `a1.`, cifrado e autenticado pelo serviço
`Crypt` já fornecido pelo Laravel. O payload contém somente finalidade
versionada, empresa, pessoa, permissão VIEW, revisão do grant, emissão e
expiração em **300 segundos**. Esses campos permanecem opacos ao navegador.
O token não vai para URL, logs, exportação ou armazenamento da preferência.

`ReadingPositionRevision` usa `encryptString`/`decryptString` e JSON, sem
serializar objetos ou criar criptografia própria. O framework oferece proteção
de integridade para os valores cifrados; a validação da finalidade, identidade,
revisão do grant e prazo é explícita na aplicação.
[Documentação primária Laravel 13](https://laravel.com/framework/docs/13.x/encryption).

Regras da comparação:

1. Ticket inicial válido só permite INSERT se a chave empresa/pessoa ainda não
   existir. Qualquer slot existente, inclusive vazio, causa 409.
2. Token persistido só permite alterar o slot existente com exatamente aquela
   revisão. Um token de linha nunca cria uma linha ausente.
3. PUT e DELETE giram a revisão. Retornar à mesma aula ou ao estado vazio não
   restaura uma revisão anterior.
4. DELETE apaga `educational_lesson_id` e `saved_at`, conservando somente a chave
   privada e a nova revisão. A referência anterior não fica em outra tabela.
5. A chave única no banco resolve dois primeiros INSERTs concorrentes. Uma
   colisão só é tratada como conflito quando a chave privada exata existe;
   falhas diferentes não são apresentadas como sucesso.

## Modelo, locks e revalidação

`educational_reading_positions` tem somente cinco colunas:

- `educational_organization_id` e `subject_key`, com UNIQUE conjunto;
- `educational_lesson_id`, FK anulável;
- `revision`, opaca e obrigatória;
- `saved_at`, anulável juntamente com a referência.

A aula referencia uma versão exata no esquema existente. Portanto, não são
copiados ID de curso, número de versão, título, conteúdo, perfil, IP, tempos de
leitura ou histórico. As FKs de organização e aula usam `ON DELETE RESTRICT`.
Não existe ID sequencial adicional. Dados armazenados incoerentes falham
conservadoramente, em vez de simular uma posição vazia.

O PUT bloqueia curso, versão publicada e depois o slot privado, nessa ordem.
Confere a aula sob esses locks e revalida o grant antes da primeira mutação.
O DELETE bloqueia apenas o slot próprio e revalida antes do UPDATE; não consulta
conteúdo nem passa a esperar um curso depois de bloquear o slot.

No primeiro INSERT, uma transação de outro curso pode disputar a mesma chave
privada e causar espera no índice único depois da revalidação inicial. Se esse
concorrente fizer rollback, a inserção pode prosseguir. Por isso, após INSERT
bem-sucedido o repositório revalida novamente grant e prazo antes do commit.
`ReadingPositionWriteRejected` é lançada dentro da transação e convertida em
403/409 fora dela, garantindo rollback do registro recém-criado. Retornar um
código de erro normalmente de dentro da transação não produziria esse rollback.

GET e exportação consultam apenas a pessoa/empresa do grant. O controller
revalida após a consulta e o middleware GET revalida novamente antes da saída.
Como nas outras operações, isso não estabelece atomicidade distribuída entre
um futuro Portal oficial e o banco da Universidade.

## Retirada, republicação e exportação

Retirar um curso não elimina a preferência. A versão e a aula antigas tornam-se
indisponíveis para retomada; o GET passa a `unavailable`. A republicação cria
nova versão e novos IDs de aula, conforme o fluxo editorial existente. O
marcador antigo permanece indisponível até uma substituição expressa. Não há
remapeamento por slug, título, ordem, número aproximado ou progresso.

A exportação inclui somente a referência própria vinculada ao acervo editorial
compartilhado com a versão exata `published` ou `archived`. Uma linha indevida
apontando para rascunho nunca publicado, outro proprietário ou conteúdo não
compartilhado não libera uma referência exportável.

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "reading_position": {
    "course_slug": "curso-exemplo",
    "course_version": 2,
    "lesson_slug": "aula-exemplo",
    "saved_at": "2026-11-17T10:00:00Z"
  }
}
```

`reading_position` é `null` quando não há referência própria exportável. O nome
do anexo é `imagine-universidade-posicao-leitura.json`. Não entram identidade,
IDs internos, revisão, tickets, títulos ou conteúdo. A exportação permanece
separada dos arquivos de favoritos e progresso, sem alterar seus contratos.

## Retenção e condição do futuro purge

A [DEC-UNI-P0-05](00-governanca/DECISAO-UNI-P0-05-2026-11-03.md) fixa a política-base
de 120 dias após perda efetiva da última elegibilidade. A classe de preferências
educacionais abrange o marcador. Slots vazios também pertencem a essa política;
não são um registro permanente independente do titular.

`saved_at`, retirar um curso, fechar uma aba ou uma falha de rede não identificam
o início do prazo. Esta entrega não cria evento de perda de elegibilidade,
agendamento de purge ou canal substituto de direitos pós-cancelamento. O provider
operacional continua deny-all até o contrato Portal ser homologado.

A proteção da ausência após a futura eliminação física tem uma condição
explícita: o purge regular deve respeitar os 120 dias, conferir a fonte oficial
e reavaliar restabelecimento de elegibilidade. Um ticket de ausência emitido
antes da criação do slot já terá expirado muito antes desse prazo. Tokens
persistidos antigos continuam incapazes de recriar uma linha ausente.

Uma **eliminação física excepcional antecipada**, inclusive restauração de
backup com supressões, precisa invalidar tickets/sessões ainda utilizáveis antes
de remover os slots. Caso contrário, um ticket de ausência inicial ainda válido
poderia voltar a encontrar ausência depois da remoção física. Não se declara
essa condição resolvida por um contador, por uma assinatura sem prazo ou pelo
DELETE HTTP. O trabalho de manutenção deverá satisfazê-la antes de existir;
nenhum purger, epoch global ou ledger de identidade foi acrescentado agora.

## Verificação preparada e integrações

`ReadingPositionFlowTest` prepara **25 testes Feature** com Laravel, migrações e
SQLite reais. Cobrem isolamento de empresas/pessoas, identidade forjada,
referência exata, validação, tickets adulterados/expirados, mudança de revisão,
conflitos de leitores, ABA de aula e slot vazio, perda física simulada de slot,
retirada/republicação, remoção sem leitura de conteúdo, exportação histórica,
revogação antes e depois do INSERT, revalidação final GET, rollback, erro de banco,
organização ausente, schema mínimo, FKs e timestamp UTC independente do offset
devolvido pelo banco.

`scripts/check-pg-reading-position.php` é guardado para o banco PostgreSQL
descartável da CI e deve executar **após migrations e antes do seed editorial**.
Recusa colisões com organizações preexistentes e utiliza somente fixtures
criadas pelo próprio script. Duas conexões reais conferem:

- curso e versão bloqueados durante a decisão de autorização;
- UPDATE concorrente impedido pelo lock do slot, com timeout e rollback;
- CAS antigo recusado após liberação do lock;
- primeiro INSERT concorrente que vence entre a consulta de ausência e a
  inserção do repositório, sem sobrescrita do vencedor;
- revalidação posterior ao INSERT e rollback quando a autoridade passa a negar;
- isolamento, slot vazio, retirada, exportação e constraints PostgreSQL.

Fixtures ficam visíveis à segunda conexão para esses ensaios e são removidas
em `finally`, por IDs capturados, na ordem de suas FKs. Nenhuma conexão,
credencial, query, revisão ou conteúdo é impresso no diagnóstico. A limpeza do
probe é uma operação do dono sintético do laboratório e não um privilégio do
runtime da aplicação.

Integrações incluídas no lote para execução na CI:

- Runtime SQL: somente `SELECT`, `INSERT` e `UPDATE` na nova tabela, sem
  `DELETE`, DDL ou sequência; matriz ampliada para 24 verificações de privilégios.
- Nova tabela e constraints no verificador de schema PostgreSQL, com 16 invariantes.
- `php scripts/check-pg-reading-position.php` nos dois workflows, antes do seed editorial.
- Dois métodos de escrita e callbacks no checker de fronteira, totalizando 14 caminhos HTTP.
- Testes Feature e jornada real de UI/navegador com salvamento, retomada exata,
  retirada, exportação, remoção, republicação e revogação.

PHP, PHPUnit, PostgreSQL e Chromium não foram executados localmente nesta
entrega. Os resultados reais deverão ser confirmados no run de integração.
Nenhum binding, provider operacional, gate, merge, deploy ou ambiente real foi
alterado por este backend.
