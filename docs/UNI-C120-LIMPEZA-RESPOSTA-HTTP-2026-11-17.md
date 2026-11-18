# C-120 — limpeza limitada de corpos de erro HTTP

17/11/2026 · Candidato em revisão. **HOLD_NO_GO** operacional.

## Motivo e limite da conclusão

As funções `api` das interfaces de aluno e editor rejeitam respostas HTTP de
erro sem usar seu conteúdo na interface. A C-120 acrescenta a finalização
explícita e limitada desses streams, preservando o tratamento existente de
erro, revogação e recuperação.

No ensaio real C-117 da CI, 36 checks passaram antes de a leitura de
`json(tutor)` exceder o prazo de 15 segundos. A resposta esperada era 503 com
`error: tutor_unavailable`, e a interface já apresentava o fallback da aula.
Esse diagnóstico identifica o ponto de espera do ensaio, mas não comprova que
a ausência de consumo do body seja sua causa. Fetch pode finalizar corpos
ignorados; esta entrega não afirma um vazamento anterior de recursos.

O efeito da mudança sobre o timeout exige execução real da CI, registrada ao
final deste documento. A asserção do JSON do Tutor permanece obrigatória. Não há aceitação de erro
sem corpo, enfraquecimento de validators ou alteração do gateway desabilitado.

## Implementação

`discardErrorBody(response)` é idêntica nas duas views. A função obtém um reader
do body e descarta os chunks recebidos. Examina somente `done` e `byteLength`;
não decodifica, interpreta, acumula, registra ou apresenta o conteúdo recebido.

Os limites são:

- **16 KiB acumulados:** ao atingir o limiar, cancela o reader sem pedir outro
  chunk. O tamanho de um chunk individual é controlado pelo navegador e pode
  exceder esse valor. Portanto, o limiar limita o trabalho entre chunks; não é
  uma promessa sobre a memória interna ou o tráfego total do navegador.
- **64 chamadas de leitura:** impede que chunks vazios ou muito pequenos
  mantenham o processamento indefinidamente.
- **Um deadline de 2 segundos:** o mesmo timer participa de todas as leituras
  por `Promise.race`, sem reiniciar a contagem a cada chunk.

Um corpo pequeno que chega ao EOF é drenado e seu lock é liberado sem cancelar
o fetch. O cancelamento ocorre somente ao atingir um limite ou encontrar erro.
`reader.cancel()` é idempotente no helper, tem tratamento de rejeição e não é
aguardado. Assim, um cancelamento que fica pendente não retém a limpeza.

Uma leitura que rejeita depois de perder o race continua com sua rejeição
observada. O `finally` limpa o timer e tenta liberar o lock; erros síncronos de
cancelamento ou liberação são contidos. Bodies ausentes, leitores indisponíveis
ou streams já bloqueados por outro consumidor degradam com segurança.

## Fluxo da interface preservado

O `api` inicia a limpeza com:

```js
if (!response.ok) void discardErrorBody(response);
```

Essa chamada ocorre antes dos tratamentos de 403 e 419 e não é aguardada.
O bloqueio de acesso continua imediato, mesmo com body e cancelamento pendentes.
As demais falhas continuam produzindo os mesmos erros; no aluno, `httpStatus`
continua disponível para o tratamento específico de 404 e fallback do Tutor.

Respostas bem-sucedidas seguem o `response.json()` original e seus validators.
O helper não cria requests, retries, gravações, downloads ou estados novos de
autorização. Não altera os pontos de recuperação manual ou a política de
conclusão sem replay.

## Verificação

`scripts/check-error-body-cleanup.mjs` extrai as funções reais de ambas as views,
incluindo `api` e `lockAccess`. Usa `Response` e `ReadableStream` nativos de Node
para EOF e cancelamento, e readers controlados para falhas e esperas sem fim.
Os **54 cenários** cobrem:

- JSON pequeno em chunks drenado até EOF, sem parse, logs, armazenamento ou
  mudança no conteúdo da interface;
- ausência de body, reader bloqueado e resultados inesperados;
- fronteira de 16 KiB, chunk maior, soma entre chunks e limite de 64 leituras,
  incluindo chunks vazios;
- falha síncrona ou assíncrona de leitura; cancelamento que lança, rejeita ou
  nunca termina; falha ao liberar o lock;
- deadline com leitura pendente, rejeição tardia depois do race e ausência de
  rejeições não tratadas;
- 403/419 com revogação real antes do deadline, 404/503 com os erros anteriores
  preservados e sucesso JSON sem passar pelo helper.

Os extratores dos checkers C-112, C-116 e C-118 passaram a incluir o helper real.
Seus asserts e fixtures de comportamento foram preservados. Os checkers que
carregam o script completo já recebem a função automaticamente. O checker
principal importa a nova suíte; seus fluxos que substituem `api` continuam com
os stubs anteriores.

Validação local executada:

```sh
node scripts/check-error-body-cleanup.mjs
node scripts/check-ui-contract.mjs
git diff --check
```

A suíte de limpeza e o checker principal passaram. Esses resultados locais
não substituem o ensaio Chromium/Laravel; não houve execução local de PHP,
PostgreSQL ou Chromium, nem alteração de guards para permitir essa execução.
O provider de autoridade normal continua desabilitado.

## Resultado da execução real

O commit `b0827f72568c0a844513b258f656f13134afbab3` foi executado em
[Actions #44200554259](https://github.com/rafhael100/imagine-universidade/actions/runs/44200554259).
O job de navegador passou: **341 verificações Chromium com falhas controladas**
e **63 verificações no percurso completo pelo Laravel/SQLite real**, seguidas
da confirmação das sessões e dos registros persistidos. A resposta 503 foi
lida como JSON com `error: tutor_unavailable`, sem retirar a asserção, e o
percurso seguiu até retirada, republicação, exportações e revogação.

Isso confirma que a alteração resolveu a espera observada nessa execução;
não estabelece uma causa universal para corpos ignorados no Fetch ou no
Playwright. O backend também passou com 171 testes e 1.826 asserções.

O resultado geral desse run foi **5 de 6 jobs aprovados**: a preparação do
PostgreSQL no laboratório de três serviços falhou sem confirmar as migrações, depois
dos testes de imagem e HTTP privado. A espera anterior podia aceitar o
servidor temporário por socket; o ajuste em `qa-staging-postgres-http.sh`
passa a exigir consulta TCP autenticada, com prazo e diagnóstico de etapa.
Essa correção de infraestrutura exige sua própria execução. A liberação
operacional continua bloqueada pelos critérios já registrados.

A correção foi verificada em seguida no commit
`0e51b459eba3d7961364b63241a3196730d749f0`,
[Actions #44202018163](https://github.com/rafhael100/imagine-universidade/actions/runs/44202018163):
**os seis jobs passaram**, incluindo a consulta TCP, as migrações com owner
separado do runtime, HTTP privado e armazenamento de sessão no PostgreSQL.
As 341 verificações Chromium e as 63 do percurso real pelo framework também
passaram novamente. Esse resultado não libera os critérios operacionais.
