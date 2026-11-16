# UNI C-42 — identidade original Imagine e navegação das telas

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

Aplicação do Design System oficial do Portal Node, conforme issue UNI #2, tokens CSS e referência histórica. A Universidade passou a carregar localmente `public/assets/imagine-tokens.css` e o **PNG original exato** do Portal, obtido de `rafhael100/imagine-portal/main/assets/logo-imagine.png`. Git blob SHA-1 **678adeceb3a8ecdaeb6b576b9ee18d1bf0396f77** foi comparado na cópia: nenhuma alteração na marca.

As duas páginas Laravel agora usam aliases dos tokens canônicos (laranja #F9941D, grafite #171B19, branco #FFFFFF, superfície #F7F7F8), tipografia Arial/Helvetica e elementos de toque >=44 px. Cabeçalhos exibem logo oficial, título e navegação real por âncoras para áreas presentes, sem links fictícios ou tentativas de contornar `university:view/manage`. Incluem acesso por teclado `Ir para o conteúdo`, links com estados de foco e layout adaptável. A navegação não adiciona login nem mistura alçadas do aluno e editor.

O teste Node verifica presença dos tokens locais, valida assinatura PNG, compara SHA exata da logomarca original e checa navegação/atalho e alvos de toque. Inspeção visual real em 360/768/1440 px, zoom 200%, leitores de tela, contraste completo e aprovação de design permanecem pendentes antes de deploy. Sem fontes remotas e sem gasto.
