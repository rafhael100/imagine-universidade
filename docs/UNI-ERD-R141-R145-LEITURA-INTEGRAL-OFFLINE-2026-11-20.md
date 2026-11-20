# UNI ERD-R141–R145 — leitura integral offline das 35 aulas

**Estado: DRAFT · HOLD_NO_GO · 13/13 NOT_VERIFIED · sem SSO, grants ou aceite editorial.**

## Entrega

A fila HTML de prioridades era navegável por teclado, mas exibia apenas metadados e perguntas editoriais. O corpo integral da aula exigia abrir outro arquivo. Este incremento gera **um segundo HTML passivo e offline**, preservando a ordem de prioridade existente, os links para anterior/próxima e as 210 perguntas de conferência. Cada um dos 35 artigos inclui agora o texto integral do rascunho, com parágrafos e quebras de linha escapados contra injeção HTML.

O documento é **somente para leitura**; não permite marcar aprovação ou preencher um status supostamente autenticado. A ferramenta original de revisão CSV permanece independente e não é substituída.

## Reprodução (Node.js, sem instalar pacotes)

```bash
node scripts/render-editorial-fulltext-html.mjs > /tmp/uni-35-fulltext.html
node scripts/verify-editorial-fulltext-html.mjs /tmp/uni-35-fulltext.html
node scripts/check-editorial-fulltext-html.mjs
node scripts/check-release-gate-policy.mjs
```

O verificador compara todos os bytes do HTML com uma recomposição determinística de `content/mvp-cursos-v1.json`; recusa arquivos alterados, excedentes a 1 MiB ou symlinks. A CLI de renderização não recebe arquivos externos, nem URLs.

## QA e segurança

- R141: fonte original do conteúdo integral vinculada por SHA-256 a cada entrada na fila.
- R142: texto integral de 35 aulas, navegação nativa e 210 perguntas acessíveis.
- R143: verificador independente do arquivo, com igualdade byte a byte e tamanho máximo.
- R144: negativas de adulteração, link remoto injetado, falsa liberação, BOM e revisão da fonte.
- R145: workflow dedicado por branch, evidência da SHA exata e verificação dos 13 gates.

A aprovação humana das 35 aulas ainda requer evidência externa autenticada; nenhum texto ou resultado automatizado se converte em signoff. A issue [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) continua bloqueando a elegibilidade oficial, revogação independente e identidade empresarial. Não há merge, deploy, mudanças de produção/VPS/DNS nem custos novos.
