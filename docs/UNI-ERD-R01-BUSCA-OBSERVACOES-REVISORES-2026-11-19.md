# UNI ERD-R01 — Busca local nas observações e revisores

**19/11/2026 · DRAFT · HOLD_NO_GO**

## Uso
Permitir que a equipe editorial encontre uma anotação por palavras contidas nas próprias observações ou pelo nome declarado do revisor, além dos nomes das 35 aulas e 10 cursos.

## Proteções
- O índice é calculado apenas em memória na página file://, durante os filtros existentes: nenhum endpoint, rede ou armazenamento automático.
- O resultado continua mostrando somente título do curso/aula, sem publicar notas ou nome de revisor no botão.
- O filtro por situação permanece obrigatório e combinado com a busca. A normalização preserva pesquisa sem acentos.
- Regressões em Chromium: palavra sem acento encontra anotação com acento; revisor é pesquisável; combinação com situação pendente rejeita match indevido.

Sem identidade autenticada nem aprovação real. 13 gates NOT_VERIFIED/HOLD_NO_GO; Portal #886 bloqueado. Validar na SHA exata.