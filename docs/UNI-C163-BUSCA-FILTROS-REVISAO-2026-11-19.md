# UNI C163 — Localizar aulas por título e situação no revisor offline

A interface de revisão de 35 aulas passa a oferecer busca local por
nome de curso ou aula, ignorando caixa e acentos, e filtro por situação:
pendente, precisa de ajustes ou declaração humana não verificada.

O filtro atua somente sobre os resultados pesquisados; não altera
status, textos, hashes nem o item selecionado sem clique explícito.
O resultado vazio é mostrado como zero, não como erro de rede.

O mecanismo usa `textContent`, nunca HTML derivado da busca, e
não envia consultas para servidores. A lista permanece recolhida quando
a busca está vazia e todas as situações estão selecionadas.
A integração Chromium exercita busca e filtro combinados, ausência
de resultados e limpeza dos campos.

O pacote CSV original mantém suas 35 linhas e todos os gates de
liberação permanecem `HOLD_NO_GO`. Sem SSO, merge ou deploy.
