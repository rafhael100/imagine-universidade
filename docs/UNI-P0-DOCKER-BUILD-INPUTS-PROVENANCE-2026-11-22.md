# UNI P0 — Proveniência dos arquivos que controlam o build Docker

**22/11/2026 · DRAFT empilhado sobre PR #174 · HOLD_NO_GO.**

## Falta identificada

O pacote `source-provenance.json` registrava cinco hashes de arquivos do
repositório, incluindo o lock do Composer e dois Dockerfiles. Entretanto,
**não** registrava o conteúdo de `.dockerignore`, que decide quais arquivos
entram no contexto do Docker. Também deixava fora da lista de hashes o
`composer.json`, a configuração Nginx de staging e o Dockerfile do QA.

Um artefato com esses cinco hashes corretos não oferecia ao revisor
checksums individuais dos demais arquivos que controlam o build.

## Mudança

O conjunto versionado `reviewedSourceFiles` passa a incluir os nove
arquivos críticos: filtro de contexto, Composer, manifesto de 13 gates,
Compose de staging, imagens PHP/Nginx, configuração Nginx e Dockerfile QA.
O gerador já compara cada arquivo aos bytes de `git show SHA:path`
**antes** de gravar o pacote, e agora o relatório de proveniência
também registra seu SHA-256 individual.

O teste unitário existente verifica a lista, unicidade e existência
dos arquivos, sem alterar conteúdo, imagens, serviços ou os 13 gates.

## Limites

Os nove hashes não substituem o commit Git completo, um digest imutável
de imagem OCI, SBOM, assinatura do release, comprovante de runtime ou
revisão independente. `runtime_image_digest_verified` permanece
`false`; `production_approval` permanece `false`.

Uma alteração de arquivos fora da lista continua coberta pelo controle
de working tree limpo da PR #173 e pela SHA do commit, não por hashes
individuais nesse relatório. A proteção ambiental da PR #174 também
continua necessária.

Sem deploy, merge, acesso real, gastos ou alterações na VPS.
