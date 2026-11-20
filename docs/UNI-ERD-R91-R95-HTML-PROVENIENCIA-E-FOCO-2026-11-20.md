# UNI ERD-R91–R95 — HTML vinculado à fonte e foco acessível (20/11/2026)

**DRAFT · SOMENTE REVISÃO OFFLINE SINTÉTICA · HOLD_NO_GO**

## Correção e entregas

- R91: o HTML anterior tinha checagem estática de 35 seções e CSP, mas nenhum verificador da saída arquivada contra os bytes reconstruídos do currículo versionado. Um arquivo alterado após geração poderia preservar as contagens e introduzir falsas alegações de aceite.
- R92: novo verificador read-only de HTML com comparação byte-exata à geração canônica de 35 aulas da fonte versionada, UTF-8 estrito e limite de 1 MiB; recusa symlink como arquivo de entrada CLI.
- R93: negativos reproduzíveis de adulteração do texto, estado, SHA, âncoras, CSS/CSP, scripts, novas linhas, fonte, gates e tamanho. Zero grants ou aceite autenticado.
- R94: 35 destinos de navegação passam a permitir foco programático (tabindex=-1) com contorno de foco visível; a ordem heurística da fila é diferenciada da posição curricular original.
- R95: workflow isolado na branch DRAFT verifica o HTML gerado antes de arquivá-lo por 7 dias, sem credenciais persistidas, dados de clientes ou efeitos de produção.

## Executar localmente

    node scripts/check-editorial-priority-html.mjs
    node scripts/check-verify-editorial-priority-html.mjs
    node scripts/check-release-gate-policy.mjs
    node ops/staging/check-release-gates.mjs
    node scripts/render-editorial-priority-html.mjs > /tmp/uni-35-lessons-source-bound.html
    node scripts/verify-editorial-priority-html.mjs /tmp/uni-35-lessons-source-bound.html

O HTML não permite registrar aceite humano, não concede acesso, não publica aulas e não substitui inspeção manual de leitores de tela, prova Chromium ou revisão pedagógica. Os 210 pontos exigem leitura humana autenticada em fluxo independente. A prova de proveniência vale apenas para a fonte sintética nesta SHA.

## Bloqueios

Os 13 gates de ops/release-gates.json permanecem NOT_VERIFIED/HOLD_NO_GO. Portal #886 segue sem fonte oficial de contratos ativos, revogação independente e identidade empresarial homologada. Não realizar merge, deploy, alterar main, VPS, DNS, habilitar SSO ou concessão real nem incorrer em custos.