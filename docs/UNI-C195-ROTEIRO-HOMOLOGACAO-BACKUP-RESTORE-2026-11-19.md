# UNI C-195 — Roteiro de homologação privada de backup e recuperação

19/11/2026 · DOCUMENTO DE PREPARAÇÃO, SEM EXECUÇÃO · HOLD_NO_GO.

## Escopo e evidências

O laboratório descartável de PostgreSQL 18 já testa dump/restore de dez cursos
e 35 aulas, checksums de todas as tabelas públicas e a integridade de RLS,
índices, constraints e sequências. Essas provas de QA não são cópia de
segurança do ambiente Leaseweb nem demonstram a viabilidade operacional.

A aprovação do gate real_backup_restoration_and_rollback exige uma execução
posterior e específica, autorizada por infraestrutura, DBA, segurança e
responsável comercial. Não executar este procedimento automaticamente.

## 1. Inventário e isolamento antes de qualquer escrita

- Confirmar no Portal #886 fonte oficial de acesso, revogação e identidade.
- Identificar VPS, projeto Docker, database, volumes e porta exclusivos da
  Universidade; não presumir porta livre nem reutilizar dados do CRM/Sites.
- Executar apenas inventário READ-ONLY autorizado via
  ops/staging/inventory-readonly.sh; registrar comandos, data e responsável.
- Confirmar os 13 gates e negar publicação enquanto algum estiver aberto.
- Definir por escrito políticas aprovadas de retenção, criptografia,
  restauração, RPO e RTO. Este documento não inventa metas numéricas.

## 2. Backup operacional candidato

- Usar papel de backup dedicado, com mínimo acesso necessário, sem credenciais
  de superusuário compartilhadas com a aplicação ou em PR/CI.
- Guardar snapshot PostgreSQL em formato custom, criptografado com chave de
  escopo restrito; registrar banco de origem, revisão, tamanho, checksum
  SHA-256, horário UTC, duração e identificação de execução, sem dados
  pessoais ou segredos no relatório de evidências.
- Se R2 for escolhido, utilizar destino e credenciais específicos da
  Universidade, segregados do piloto de backup do n8n e da conta de produção.
  Não criar bucket/chaves ou executar upload nesta entrega.
- Comprovar mecanismo de agendamento, verificação de êxito/falha, alertas,
  rotação de credencial e retenção real definida conforme LGPD.

## 3. Restauração privada independente

- Restaurar em banco descartável NOVO, sem --clean sobre a origem, sem porta
  pública e sem compartilhar credenciais com os projetos Imagine.
- Conferir leitura, migrações, contagem/hash de tabelas, FKs, índices,
  RLS/policies, estado de sequências e os grants mínimos por papel.
- Simular falhas de cópia truncada, chave inválida e permissão insuficiente.
  Confirmar recusa, alerta e nenhuma modificação da origem.
- Testar o procedimento de retorno à versão anterior em stack isolada,
  com aprovação de janela e método de reversão do proxy. Sem troca de DNS
  ou tráfego de clientes no piloto.
- Medir RTO observado e atraso entre último snapshot e ponto recuperável;
  comparar SOMENTE às metas previamente aprovadas.

## 4. Registro e critério de saída

Anexar ao gate, em issue/PR auditável, pelo menos: inventário aprovado,
manifesto de backup sem dados sensíveis, checksum, logs saneados, resumo da
restauração em ambiente independente, divergências encontradas, medição de
RPO/RTO e assinaturas humanas DBA/AppSec/LGPD. Não publicar em CI arquivos
de dados, segredos ou imagens da VPS.

GO para o gate de backup requer revisão independente da evidência real.
O script ops/staging/release-gate-policy.mjs mantém NOT_VERIFIED até então.

## Não executar por este documento

Nenhum comando aqui liga container, altera VPS, acessa Cloudflare/R2,
configura scheduler, ativa credenciais ou cria autorização de cliente.
Os ensaios sintéticos continuam separados de homologação funcional privada.

Referências: Portal #886, PR Universidade #85, ops/release-gates.json,
scripts/qa-pg-backup-restore.sh, docs/UNI-C193 e docs/UNI-C194.
