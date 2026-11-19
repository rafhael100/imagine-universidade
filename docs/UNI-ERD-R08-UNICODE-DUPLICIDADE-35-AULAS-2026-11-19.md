# UNI ERD-R08 — duplicidade e controles invisíveis nas 35 aulas

**19/11/2026 · PR DRAFT · HOLD_NO_GO · auditoria sintética/offline**

Lacuna reproduzível: copiar integralmente o texto de uma aula para outra identidade preservava a contagem de 10 cursos, 35 aulas, os 140 blocos e seus comprimentos mínimos, passando na auditoria estrutural. Caracteres bidirecionais invisíveis em nomes e textos também não eram rejeitados.

A auditoria passa a impedir corpos de aula duplicados, mesmo com diferenças apenas de espaços/quebras de linha (normalização NFKC), e controla Cf, marcadores bidi e controles C0/C1 nos títulos e corpos, preservando LF usado nas seções pedagógicas. Foram acrescentados cinco testes negativos: cópia exata, cópia com whitespace diferente, controle bidi no curso, marcador invisível no corpo, controle bidi no título.

A revisão continua **estrutural**: duplicação textual e controles podem ser rejeitados sem autenticar autoria, precisão científica, acessibilidade didática, direitos autorais ou aceite editorial. Os 35 textos e seus hashes/manifestos NÃO foram modificados. Execução prevista: `node scripts/check-editorial-lesson-structure.mjs` e `node scripts/audit-editorial-lesson-structure.mjs`. A CI na SHA final precisa ser verificada.

Todos os 13 gates continuam NOT_VERIFIED / HOLD_NO_GO. Autoridade oficial e revogação: https://github.com/rafhael100/imagine-portal/issues/886.
