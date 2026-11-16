# UNI C-48 — demonstração offline navegável do catálogo atual

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A prévia `preview/current.html` é autônoma, executa localmente e usa **exatamente o manifesto versionado de 10 cursos e 35 aulas** (sem publicação editorial). Permite navegar, pesquisar com normalização, filtrar, abrir aulas, ver exemplos e atividades, simular conclusões e retomar estudos. Esse progresso fictício é salvo apenas em `localStorage` do navegador, sem tenant, sujeito, contato ou rede. A logomarca original do Portal Node foi copiada com SHA Git idêntico. HTML usa DOM com `textContent` e não interpreta scripts de aulas. Sem login real, sem certificados, provas, promessa de resultados, solicitação de credenciais ou ativação de serviços.

`preview/current-check.mjs` valida sincronização integral do manifesto, SHA da marca, sintaxe JS e ausência de chamadas de rede; integrado ao job isolado de QA. Esta prévia **não substitui** teste autenticado em navegador das páginas Laravel nem o Portal oficial. Nenhum arquivo do diretório preview é publicado no app Laravel. Uma revisão visual humana ainda é necessária.

## Capturas automatizadas de prévia

O job `browser-preview` executa Chrome/Chromium headless em `file://` exclusivamente para `preview/current.html`, confirma dez botões de curso criados pelo JavaScript e gera capturas solicitando larguras 360, 768 e 1440 px. Elas são anexadas ao run do GitHub Actions por um dia para inspeção manual. Não há servidor, SSO, cookies reais, rede, dados pessoais nem deploy. O teste não substitui navegação autenticada Laravel nem inspeção humana de zoom, contraste e leitor de tela.
