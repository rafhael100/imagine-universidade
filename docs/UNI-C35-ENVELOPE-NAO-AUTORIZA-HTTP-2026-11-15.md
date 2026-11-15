# UNI C-35 — um envelope assinado não é uma autorização HTTP

**15/11/2026 · testes negativos integrados · DRAFT / NO-MERGE / NO-DEPLOY**

O contrato técnico Ed25519 da Universidade prepara a verificação de mensagens de servidor e a reserva única do nonce, mas uma assinatura correta nunca prova, isoladamente, que há sessão business válida, serviço Imagine elegível ativo e não revogado, vínculo editorial ou autorização para um recurso.

Os três testes Feature em `PortalEnvelopeDoesNotAuthorizeHttpTest` demonstram que:

1. Mesmo com envelope Ed25519 válido, nonce reservado e sessão/headers/body preenchidos manualmente, as rotas privadas Cliente continuam respondendo HTTP 403 e não gravam progresso nem provisionam empresa.
2. Um envelope com `university:manage` válido também não autoriza criar, publicar ou excluir cursos: nenhuma linha editorial/auditoria é criada.
3. Um banco de nonce indisponível impede a admissão e jamais abre acesso por fallback.

A classe de admissão continua retornando apenas `PortalSignedClaimCandidate`, e o provider real permanece `UnavailablePortalAuthority`. Nenhum teste registra uma autoridade permissiva na aplicação. Os vetores usam chaves e dados exclusivamente sintéticos. Esse resultado cobre a fronteira negativa atual, não homologa emissor real, mTLS, sessão, revogação, serviço ativo ou go-live.
