# UNI C-45 — histórico editorial privado, paginado e minimizado

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY

O painel administrativo passou a exibir **Histórico editorial** com atualização e paginação explícita. A API privada GET /universidade/private/admin/audit exige a permissão `university:manage`, filtra a organização editorial central, retorna no máximo 50 eventos por página e aceita somente cursor numérico `before_id`. A resposta contém tipo de evento, recurso, identificador interno do recurso, revisão e horário. Não inclui `actor_key`, nomes, e-mails, tokens, IPs nem texto de aulas.

A UI renderiza apenas por `textContent`, descarta respostas antigas e apaga o histórico ao receber revogação HTTP 403/419. Testes Feature sintéticos cobrem 55 eventos, duas páginas 50/5, cursor inválido, cliente recusado e omissão do identificador de operador. A política de retenção, autorização real do Portal e revisão LGPD permanecem necessárias antes de qualquer implantação.
