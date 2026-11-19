# UNI ERD-R07 — auditoria estrutural das 35 aulas
**19/11/2026 · DRAFT · HOLD_NO_GO / NO-MERGE / NO-DEPLOY**

A verificação automática do acervo atual `content/mvp-cursos-v1.json` confirma **10 cursos, 35 aulas com identidades únicas e 140 partes pedagógicas** (introdução, exemplo fictício, aplicação opcional e cuidado importante), todos com texto mínimo. O acervo permanece `editorial_draft`, exclusivo a clientes Imagine ativos **apenas como intenção de audiência**: não há acesso real concedido.

A inspeção documental sinaliza 24 introduções que repetem a expressão "Aplicação opcional" antes do cabeçalho específico da atividade, oportunidade **não bloqueante** de uniformização humana. Não alterar diretamente as aulas sem nova revisão dos 35 hashes e do CSV: a fonte textual é imutável para a revisão atualmente em curso.

Arquivos: `scripts/audit-editorial-lesson-structure.mjs` (leitura somente) e `scripts/check-editorial-lesson-structure.mjs` (10 cenários negativos: publicação indevida, audiência, curso/aula ausente, duplicidade, cabeçalhos ausentes/reordenados, atividade vazia, título ausente). A CI isolada `uni-erd-offline-qa.yml` executa ambos sem Laravel, Portal, SSO, credenciais ou rede externa. **A execução na SHA final e os resultados dos jobs precisam ser conferidos no Actions.**

**Limitações explícitas:** presença e tamanho dos blocos **não** comprovam exatidão técnica, linguagem, clareza, direitos autorais, acessibilidade pedagógica, revisão humana, legitimidade de evidências ou signoff. Nenhum status de CSV é uma aprovação autenticada; todos os 13 gates mantêm `NOT_VERIFIED` e `HOLD_NO_GO`. Autoridade oficial de serviço ativo, identidade e revogação continuam pendentes em [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886).
