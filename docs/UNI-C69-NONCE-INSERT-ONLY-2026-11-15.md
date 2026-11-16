# UNI C-69 — ledger de nonce com runtime somente INSERT

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A futura autoridade Portal deve proteger nonces de assinatura contra reutilização. O papel runtime da Universidade recebe **apenas INSERT** na tabela `educational_portal_replay_nonces`, sem SELECT, UPDATE ou DELETE. A limpeza após retenção não é incumbência do aplicativo HTTP: exige manutenção separada e autorizada com limites, auditoria e política de exclusão.

O SQL candidato de staging e o teste PHP/PostgreSQL18 verificam explicitamente que o runtime não consegue apagar provas de uso de nonce. Esse controle não transforma candidatos de assinatura em autorização, não ativa PortalAuthority e não faz limpeza real. Todos os 13 gates de produção continuam não verificados.
