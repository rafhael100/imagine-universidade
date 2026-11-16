# UNI C-50 — contrato automatizado para evitar regressões de contraste

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A revisão integrada #60 já corrigiu visualmente os rodapés de Aluno/Admin para `#565D56`, com contraste WCAG 2.1 AA para texto pequeno sobre superfície Imagine #F7F7F8. O teste Node `scripts/check-ui-contract.mjs` passa a verificar a razão de contraste sRGB (>=4,5:1) a partir do CSS real de ambas as páginas, impedindo retorno silencioso a tons claros insuficientes.

Este contrato complementa, sem substituir, o teste Chromium + axe-core do laboratório isolado, os testes manuais de leitura por voz e a homologação de identidade. A cor principal laranja Imagine e a marca original permanecem inalteradas.
