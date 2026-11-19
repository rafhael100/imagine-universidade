# UNI C-194 — Provas negativas da restauração estrutural

19/11/2026 · laboratório PostgreSQL18 descartável; DRAFT / HOLD_NO_GO.

O ensaio C193 comparava estrutura e conteúdo do banco fonte e do clone
restaurado, além de provocar adulteração de texto somente no clone.

Este complemento comprova que a verificação estrutural realmente detecta
duas mudanças críticas feitas exclusivamente na cópia de QA:

1. Alterna ENABLE/DISABLE ROW LEVEL SECURITY em uma tabela de nonces.
   Confirma hash estrutural diferente; desfaz a alteração e exige igualdade.
2. Remove o índice secundário de expiração de nonce
   edu_portal_nonce_expiry_idx e exige divergência do fingerprint.

O script compara novamente o hash estrutural do banco sintético original
e exige que permaneça intacto. O clone e dump são descartados no trap.
Os testes dependem de sucesso efetivo do docker-lab na mesma SHA.

Essas provas não testam restauração de privilégios/ACL (dump usa --no-acl),
SSO, serviços ativos, R2, retenção, RPO/RTO ou a VPS real. Os 13 gates
permanecem NOT_VERIFIED; nenhuma publicação ou merge é autorizado.
