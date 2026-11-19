# UNI C187 — Preflight de caminho da exportação editorial

**19/11/2026 · DRAFT · HOLD_NO_GO · sem publicação**

## Problema
O gerador de pacotes verificava se **o diretório final** era um symlink, mas não se algum dos diretórios ancestrais era um symlink. Assim, `--out /tmp/atalho/novo-pacote` poderia escrever em um destino inesperado por meio de `atalho`, mesmo que `novo-pacote` ainda não existisse.

## Correção
Antes de criar diretórios, o gerador inspeciona cada componente existente, desde o destino até sua raiz. Recusa symlink e ancestrais não-diretório, sem seguir o desvio para gravar arquivos. A verificação evita acidentes de configuração; não pretende garantir resistência contra um invasor que substitua componentes concorrentemente (TOCTOU). `--out` segue explícito, com pasta vazia e sem sobrescrita de revisão humana.

## Teste
`scripts/check-editorial-review-pack.mjs` constrói um symlink em uma pasta temporária e tenta apontar o `--out` para um subdiretório não existente via link. O processo precisa recusar, e o diretório de destino real deve continuar inexistente. Exigir CI na SHA exata. Sem network, SSO, merge, deploy, grants ou acesso a dados reais.
