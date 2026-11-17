# C-114 — detectar recursos existentes antes do staging

17/11/2026 · **DRAFT / HOLD_NO_GO / sem execução na VPS**.

## Problema corrigido

O Compose candidato declara o projeto `imagine-universidade-staging`, mas o
inventário anterior só reconhecia os aliases `imagine-uni-stage` e
`university-stage`. Um contêiner gerado pelo próprio Compose podia passar pela
checagem sem ser identificado. Redes e volumes remanescentes de uma execução
anterior também não eram consultados.

## Comportamento

`ops/staging/inventory-readonly.sh` continua recebendo uma única porta candidata.
Ele recusa contextos Docker remotos ou sobrescritos, a porta reservada 18081,
sockets ocupados e recursos abaixo dos pisos preliminares existentes.

A descoberta agora consulta separadamente:

| Recurso | Nomes | Vínculo ao projeto |
|---|---|---|
| Contêineres, incluindo parados | `docker ps -a` | Filtro exato da label `com.docker.compose.project` |
| Redes, mesmo sem contêineres | `docker network ls` | O mesmo filtro de projeto |
| Volumes, mesmo sem contêineres | `docker volume ls` | O mesmo filtro de projeto |

O nome canônico e os aliases históricos são reconhecidos com limites de prefixo:
um projeto parecido, como `imagine-universidade-staging2`, não é confundido com o
projeto escolhido. São aceitos os separadores de nomes do Compose atual e antigo.
Uma label do projeto também identifica recursos renomeados. O reconhecimento por
nome cobre recursos sem label, inclusive redes e volumes órfãos.

Qualquer colisão ou falha de leitura termina com `HOLD`, sem tratar uma consulta
indisponível como inventário vazio. A saída informa somente o tipo de recurso que
exige revisão; não publica nomes, IDs, labels, ambientes ou diagnósticos brutos do
Docker. Nenhum recurso é removido ou reaproveitado automaticamente.

## Verificação local

```sh
bash -n ops/staging/inventory-readonly.sh
node ops/staging/check-inventory.mjs
```

O checker contém uma allowlist exata das chamadas Docker permitidas e executa
`scripts/check-staging-inventory.mjs`. A regressão roda o **script Bash real** com
comandos temporários de fronteira em um `PATH` isolado. Ela não chama um daemon
Docker, não inspeciona sockets reais e não lê o ambiente de staging.

Os 44 cenários cobrem o inventário vazio, recursos de outros projetos, os nomes
canônicos, aliases históricos, contêineres parados, redes e volumes órfãos,
recursos renomeados com label, indisponibilidade de cada consulta ou do parser de
sockets, sockets IPv4 e IPv6, porta inválida/reservada, contexto remoto, host incompatível e recursos
insuficientes ou ilegíveis. Valores sentinela verificam que a saída não revela
nomes/IDs nem mensagens brutas de erro.

## Limites preservados

Um resultado sem colisões vale somente para o instante da leitura. Não reserva
porta, não prova capacidade da VPS e não autoriza `compose up`, migrations,
concessões SQL ou publicação. Os 13 gates em `ops/release-gates.json` permanecem
inalterados; a autoridade real continua `UnavailablePortalAuthority`.

A integração operacional ainda depende da fonte de serviços ativos, revogação,
identidade empresarial e autoridade editorial do Portal, além da homologação e
aprovações existentes. Esta correção prepara o inventário futuro e não declara
nenhuma dessas evidências satisfeita.
