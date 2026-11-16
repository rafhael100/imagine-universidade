# UNI C-48 — demonstração offline navegável do catálogo atual

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A prévia `preview/current.html` é autônoma, executa localmente e usa **exatamente o manifesto versionado de 10 cursos e 35 aulas** (sem publicação editorial). Permite navegar, pesquisar com normalização, filtrar, abrir aulas, ver exemplos e atividades, simular conclusões e retomar estudos. Esse progresso fictício é salvo apenas em `localStorage` do navegador, sem tenant, sujeito, contato ou rede. A logomarca original do Portal Node foi copiada com SHA Git idêntico. HTML usa DOM com `textContent` e não interpreta scripts de aulas. Sem login real, sem certificados, provas, promessa de resultados, solicitação de credenciais ou ativação de serviços.

`preview/current-check.mjs` valida sincronização integral do manifesto, SHA da marca, sintaxe JS e ausência de chamadas de rede; integrado ao job isolado de QA. Esta prévia **não substitui** teste autenticado em navegador das páginas Laravel nem o Portal oficial. Nenhum arquivo do diretório preview é publicado no app Laravel. Uma revisão visual humana ainda é necessária.
