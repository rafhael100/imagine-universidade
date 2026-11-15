# UNI C-24 — barreira atômica contra replay de envelope assinado

**15/11/2026 · mecanismo de segurança candidato · DRAFT / NO-MERGE / NO-DEPLOY**

## Contexto

O verificador Ed25519 da Universidade aceita apenas um envelope assinado de teste, mas uma assinatura válida e com prazo curto pode ser apresentada mais de uma vez. Esta entrega prepara um mecanismo **single-use** para uma futura troca autenticada entre Portal e Universidade.

## Implementação
- Nova migração `2026_11_15_000005_create_portal_replay_nonces.php`: tabela `educational_portal_replay_nonces` com índice **único** sobre `nonce_sha256`, expiração e hora da reserva. Não armazena empresa, usuário, conteúdo da mensagem nem o nonce em texto puro.
- `PortalSignedNonceReplayFence::reserveOnce()` valida nonce hexadecimal de 128 bits, revisão, emissão/expiração e intervalo máximo de 60 segundos. Executa **insertOrIgnore** no banco para que somente a primeira reserva possa retornar verdadeiro; banco indisponível resulta em **false**, nunca liberação.
- A operação é apenas reserva de nonce; **não é validação de SSO, prova de contrato ou autorização HTTP**. A autoridade de produção `UnavailablePortalAuthority` permanece inalterada e nega tudo.
- `PortalSignedNonceReplayFenceTest`: quatro testes Laravel com SQLite em memória verificam primeira/segunda reserva, tentativa de reutilização entre empresas, invalidez de tempo, banco indisponível e integração com assinatura sintética Ed25519.
- `scripts/check-pg-nonce.php`: laboratório PostgreSQL18 executa duas inserções do mesmo hash e outra independente, verifica unicidade e faz **ROLLBACK integral**, com guarda que exige o banco `uni_ci` na máquina descartável. Integrado ao workflow e ao Docker QA.

## Requisitos para utilização real futura
- Verificação de identidade/mTLS do emissor Portal, assinatura/audiência/tenant, sessão business e fonte oficial de serviços elegíveis.
- Não considerar nonce como prova suficiente de autorização: verificar **revogação do contrato, organização e permissão** no servidor antes de entregar o recurso, inclusive depois do primeiro uso.
- Definir com AppSec/DBA/LGPD política de limpeza de hashes expirados, retenção de logs e falhas de banco. A validade de 60 segundos não autoriza reutilização em qualquer condição.
- Testes de concorrência com clientes PostgreSQL paralelos e rollback/deploy em ambiente de homologação ainda são gates.

## Homologação
Rodar PHPUnit Unit/Feature em PHP 8.3, migrações PostgreSQL18, verificador SQL nonce e scripts de interface. **Não reivindicar aprovação antes de verificar a execução GitHub Actions**.

Sem deploy, fusão de branches, custos novos ou dados de clientes.
