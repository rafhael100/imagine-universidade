# UNI C-101 — resposta de gravação editorial incerta não pode disparar repetição automática

**16/11/2026 | PR #81 DRAFT | somente ensaios sintéticos**

## Problema concreto

O editor operava com `POST`, `PATCH` e `DELETE` sobre cursos, aulas, publicação e arquivamento. Um HTTP 503 ou timeout pode ser emitido depois de o servidor concluir uma mutação. Reabilitar imediatamente os controles permitiria uma segunda solicitação sobre estado desconhecido: novo curso duplicado, nova versão publicada/arquivada em sequência, exclusões e alterações sem confirmação.

## Proteção implementada

- Os **seis caminhos** de escrita editorial chamam `freezeUncertainEditorialWrite` quando uma resposta ou atualização posterior falha, sem presumir que a alteração não ocorreu.
- A função registra `writeOutcomeUnknown=true`, invalida `catalogReady` e `lessonsReady`, invalida respostas antigas, desabilita os controles de criação, edição, publicação, retirada do ar e exclusão e preserva temporariamente os campos, agora não editáveis.
- O aviso orienta o editor a **não repetir a operação**. Não há novo POST/PATCH/DELETE automático.
- A ação **Tentar carregar cursos** pede confirmação explícita de que a consulta pode substituir dados não salvos, porque a resposta anterior não confirmou o efeito da escrita. Cancelar mantém a trava e o rascunho no navegador.
- Somente após uma nova consulta confiável de cursos e aulas a trava é liberada, os botões são reconstruídos e o resultado real no servidor fica visível. Se essa consulta falhar ou a sessão for revogada (403/419), não existe liberação.
- Todas as operações seguem protegidas no servidor por permissões e revisões atuais; a camada do navegador é apenas uma barreira adicional, não um substituto da idempotência de API, da transação ou de trilha de auditoria.

## Verificações

- `scripts/check-ui-contract.mjs` testa a função real de congelamento e exige sua chamada nos seis caminhos editoriais, bloqueio de controles, manutenção do estado incerto e verificação voluntária.
- `scripts/qa-browser-synthetic.cjs` simula criação de curso **concluída** no servidor seguida de HTTP 503, assegurando exatamente um POST, trava editorial e preservação temporária do rascunho. O primeiro pedido de reconciliação é cancelado pelo usuário sem efeitos; o segundo aceita reconsultar e encontra o curso que já foi criado, **sem segundo POST**.
- A QA de navegador e PostgreSQL usa exclusivamente dados fictícios em runner descartável; não habilita uma API comercial nem testa servidores reais.

## Prontidão e limites

Permanece `HOLD_NO_GO`: ausência de fonte oficial de contratos/serviços vigentes Portal #886, revogação independente, SSO/MFA, autorização por recurso, revisão AppSec/DBA/LGPD, responsabilidade editorial, homologação VPS e backup/rollback. Não houve merge, deploy, acesso real, pagamento ou publicação de aulas.
