# UNI C-148 — Recusar candidato expirado durante a reserva SQL

## Problema identificado

`PortalSignedNonceReplayFence::reserveOnce` conferia a validade somente antes de
`insertOrIgnore`. Se a execução ou o retorno SQL demorasse além do vencimento do
candidato, uma inserção única ainda devolvia `true` com o horário inicial.

O caminho foi confirmado pela leitura do código da candidata C-146
`4d0c2fb4e0125d6ebaa0e3677e8c91b340c0af7a`. A reprodução executável abaixo foi
preparada para os ambientes de QA existentes; não foi executada no ambiente de
edição, que não tem PHP, Composer ou PostgreSQL.

## Correção

- A reserva mede o tempo decorrido com `hrtime(true)` e soma os segundos
  arredondados para cima ao `nowEpoch` informado pelo chamador, como já faz
  `PortalAccessGate`.
- A resposta exige tanto a inserção única quanto validade ainda futura no
  instante da devolução. Um candidato que venceu durante a espera é recusado.
- O relógio de referência continua sendo o do chamador, inclusive nos testes
  com época sintética; nenhuma comparação usa diretamente `time()`.
- Uma reserva que terminou tarde mantém o hash consumido. A correção não exclui
  a linha, não repete a inserção e não permite reutilizar o nonce em outra
  empresa ou em um candidato com vencimento renovado.

O arredondamento conservador pode recusar uma validade com menos de um segundo
de margem. Não amplia TTL nem modifica a política de retenção dos nonces.

## Regressões preparadas

`PortalSignedNonceReplayFenceTest` inclui dois cenários com SQLite real e um
atraso de 1,1 segundo no retorno do INSERT:

1. Candidato com um segundo restante é recusado, mas sua linha fica íntegra e
   impede replay mesmo com outra empresa e validade renovada.
2. Candidato com 30 segundos restantes continua sendo aceito uma única vez.

`scripts/check-pg-nonce.php` preserva os checks anteriores e passa a executar a
classe real sobre a mesma conexão PDO e a mesma transação descartável. Um
trigger de ensaio chama `pg_sleep(1.1)` dentro do PostgreSQL. Verifica
a recusa após vencimento, a aceitação ainda válida, a retenção global do hash e
a reversão das linhas, função e trigger. O atraso SQL é real; este cenário não
é apresentado como teste de disputa de lock entre duas sessões.

A transação é aberta e revertida pela conexão Laravel, com conferência do
contador interno, da PDO exata e de `inTransaction()`. Assim, o tratamento de
conexão perdida não pode repetir uma inserção fora da transação de ensaio.
Essa proteção foi acrescentada após revisão independente da implementação da
conexão fixada no `composer.lock`.

As verificações de ambiente existentes permanecem, com recusa adicional de
arquivos `.env`, overrides por URL e divergência na configuração efetiva do
Laravel. Ambos os chamadores existentes — CI isolada e Docker descartável —
instalam o Composer antes desse script. Não há alteração em workflows ou
credenciais, nem conexão a outro host.

## Validação nesta edição

- Executado: revisão estática do caminho, `git diff --check` e
  `node scripts/check-write-fence.mjs` (os mesmos 15 caminhos HTTP preservados).
- Pendente: lint PHP, PHPUnit/SQLite e script PostgreSQL nos jobs já existentes.
- O caso negativo deve falhar no código anterior, que retornava somente o
  resultado da inserção, e passar com a conferência temporal após SQL.

## Limites

`PortalSignedClaimCandidate` continua sem poder autorizar acesso, comprovar
serviço ativo ou comprovar ausência de revogação. `UnavailablePortalAuthority`,
as rotas, as permissões, o SSO e os 13 gates de liberação permanecem intactos.
Não houve merge, deploy, uso de dados reais ou alteração da VPS.
