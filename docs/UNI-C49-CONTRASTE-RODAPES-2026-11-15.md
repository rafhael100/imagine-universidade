# UNI C-49 — correção de contraste nos rodapés da Universidade

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A avaliação de CSS identificou texto pequeno nos dois rodapés abaixo do contraste WCAG 2.1 AA 4,5:1 contra o fundo Imagine #F7F7F8: aluno #8892A1 (~2,94:1) e editor #8F98A4 (~2,73:1). Ambos foram alterados para grafite #545454, preservando a identidade visual principal, tipografia, layout e demais tokens canônicos.

O contrato de frontend Node agora executa a fórmula WCAG de luminância e recusa novas alterações de cor de rodapé abaixo de 4,5:1 nas duas páginas. Isso cobre essa combinação específica; **não substitui o teste axe completo** nem leitor de tela, navegação mobile e zoom. Nenhuma alteração em identidade, catálogo, grants ou VPS.
