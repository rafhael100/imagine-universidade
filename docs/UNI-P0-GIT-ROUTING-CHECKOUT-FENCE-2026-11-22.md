# UNI P0 — Recusar redirecionamento do Git ao gerar relatório de prontidão

**22/11/2026 · PR empilhada sobre #173 · DRAFT / HOLD_NO_GO.**

## Falha reproduzida antes da correção

`requireCleanReleaseCheckout(root)` consulta `git status` e `git ls-files` em
um checkout supostamente fixado pela SHA. Porém, os subprocessos herdavam
`GIT_WORK_TREE`. Um passo anterior pode definir essa variável apontando
para outro diretório com arquivos rastreados idênticos. Nesse caso:

- HEAD do repositório original permanece idêntica;
- um novo PHP malicioso aparece no verdadeiro diretório de build;
- `git status --porcelain=v1 --untracked-files=all` examina a pasta
  alternativa, responde vazio e não vê o arquivo real.

A reprodução foi executada com Git nativo em diretórios sintéticos
descartáveis. Não envolveu VPS, produção, credenciais nem rede.

## Correção

Antes de qualquer leitura de status/índice, o gerador recusa variáveis
ambientais que possam alterar worktree, Gitdir, index, object database,
namespaces ou configuração Git. A recusa cobre `GIT_WORK_TREE`,
`GIT_DIR`, `GIT_INDEX_FILE`, `GIT_CONFIG_COUNT`,
`GIT_CONFIG_KEY_N`, `GIT_CONFIG_VALUE_N` e demais chaves definidas
em código. A mensagem de erro é fixa e **não exibe paths nem valores**.

## Regressões

`scripts/check-university-readiness-pack.mjs` adiciona:

1. Reprodução Git nativa com HEAD idêntica, injeção não rastreada e
   `GIT_WORK_TREE` apontando para outra pasta limpa. O novo código
   deve recusar antes de emitir o pacote.
2. Recusa de overrides de index, Gitdir, parâmetros de configuração,
   valores indexados e arquivo global, seguida de restauração do ambiente
   e verificação da aceitação do checkout limpo.

O pacote mantém `HOLD_NO_GO`, os 13 gates `NOT_VERIFIED`,
`source-provenance.json` e hashes; não é imagem de deploy.

## Limites

A verificação evita esta classe de redirecionamento ambiental. Ela não
substitui controle de runner, assinatura de artefato, prova de contêiner,
revisão AppSec ou homologação das autoridades do Portal #886.
As PRs #85/#149 permanecem históricas/editoriais; não houve merge/deploy.
