# UNI C177 — Resultados editoriais acessíveis sem anúncios repetidos

**Data:** 19/11/2026. **Escopo:** busca textual no revisor offline dos 10 cursos/35 aulas.

## Problema e correção

A caixa de contagem da busca tem `role=status` e `aria-live=polite`. Mesmo quando duas buscas diferentes produziam exatamente o mesmo número de resultados, o editor reescrevia o mesmo texto, induzindo anúncios redundantes. A C177 só atualiza essa caixa quando a mensagem (incluindo número) realmente muda. A seleção de status, os botões de aulas e o próprio filtro continuam funcionando normalmente; toda a navegação é local, sem API ou persistência automática.

## QA na interface Chromium

Instala-se um `MutationObserver` no contador após pesquisar termo inexistente. Outra pesquisa igualmente inexistente deve manter zero mutações nessa região. Ao limpar a pesquisa, o resultado muda para o filtro vigente e deve haver pelo menos uma atualização. O teste acompanha todas as verificações de C176 sobre notas/status, além de regressões de 35 hashes, mesclagem e os bloqueios operacionais.

**Sem permissão operacional:** `HOLD_NO_GO`; 13 gates não verificados, equipe editorial sem autenticação e Portal #886 sem autoridade real de contratos. Sem merge/deploy.
