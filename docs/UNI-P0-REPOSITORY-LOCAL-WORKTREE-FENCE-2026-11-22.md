# UNI P0 — Conferir o worktree efetivo do Git antes do pacote

**22/11/2026 · branch empilhada sobre PR #175 · HOLD_NO_GO.**

## Bypass concreto sem variáveis de ambiente

Mesmo depois da proteção de `GIT_WORK_TREE` pela PR #174, a
configuração **local e não versionada** do repositório
(`.git/config: core.worktree`) podia redirecionar `git status`.

Reprodução em Git nativo com duas pastas sintéticas:

1. Criar commit e adicionar `injected.php` à pasta de build real.
2. Verificar `git status --porcelain` exibindo o arquivo não rastreado.
3. Configurar `git config --local core.worktree <pasta-limpa>`.
4. Confirmar HEAD inalterada e `git status` vazio.

O gerador antigo aceitava essa leitura como se o checkout real estivesse limpo.

## Correção

`requireCleanReleaseCheckout` agora compara
`git rev-parse --show-toplevel` com a pasta de trabalho recebida,
**ambas normalizadas com realpath**, antes de validar o status do Git.
Qualquer divergência ou falha de verificação recusa a criação do pacote
com mensagem fixa, sem vazar o caminho alternativo ou nome de arquivo.

A regressão acrescentada à suíte usa repositórios Git descartáveis,
reproduz a falsa aparência de checkout limpo, exige recusa, desfaz a
configuração maliciosa e confirma que o arquivo original volta a ser
detectado até ser excluído.

## Limites

O teste não substitui CI nativa da SHA, integridade de runners, assinatura
de artefato, revisão AppSec, homologação na VPS ou prova de serviços ativos
do Portal #886. A verificação de Git continua apenas uma proteção auxiliar.

13 gates `NOT_VERIFIED`, `HOLD_NO_GO`, sem merge, deploy, cobrança,
grants, credenciais reais ou alterações de produção.
