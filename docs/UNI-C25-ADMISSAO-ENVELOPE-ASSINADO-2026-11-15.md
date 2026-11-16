# UNI C-25 — admissão do envelope assinado sem concessão de acesso

**15/11/2026 · revisão técnica / DRAFT / NO-MERGE / NO-DEPLOY**

## Entrega candidata

A classe `PortalSignedEnvelopeAdmission` encadeia obrigatoriamente as duas
etapas preparadas nas entregas anteriores: (1) verificação estrita de
assinatura Ed25519, emissor, audiência, organização, permissão e prazo;
(2) reserva atômica e de uso único do nonce SHA-256 em banco de dados.

- O fluxo só retorna um `PortalSignedClaimCandidate` depois das duas etapas.
- Assinatura inválida, organização divergente, permissão divergente, expiração,
  repetição do nonce e indisponibilidade do banco retornam `null`.
- Inspeção inválida **não consome** um nonce que posteriormente possa chegar
  num envelope legítimo.
- Um mesmo nonce não pode ser reutilizado, nem sob outra organização com uma
  assinatura válida.
- **O retorno nunca é `PortalGrant`** e não comprova serviço ativo, sessão
  válida nem ausência de revogação. Nenhuma rota ou provider operacional
  utiliza a nova classe.

## Testes escritos

`tests/Feature/PortalSignedEnvelopeAdmissionTest.php` adiciona quatro cenários
em SQLite efêmero, com chaves e organizações estritamente sintéticas:
uso único; assinatura/tenant/permissão; replay entre empresas; expiração e
falha do banco. A execução integral deverá acontecer no CI de laboratório
descartável em PHP 8.3 e PostgreSQL 18 antes de marcar **PASS**.

## Gates que continuam obrigatórios

- Portal deve confirmar fonte oficial dos contratos/serviços elegíveis,
  revogação, sessão custodiada no backend, origem da requisição e vínculo de
  permissão por recurso; sem isso, a autoridade continua `deny-all`.
- Revisão independente AppSec/DBA/LGPD, matriz de ameaças, rollback seguro
  e homologação de fluxo cliente e administrador em ambiente separado.
- O contrato final de confiança (chaves públicas, rotação e transporte/mTLS)
  exige validação conjunta Portal–Universidade antes de conectar o serviço.
- Sem merge na `main`, sem credenciais, sem despesas ou publicação na VPS.

Referências: UNI C-24, PR integrada #33 e Portal issues #848/#886.
