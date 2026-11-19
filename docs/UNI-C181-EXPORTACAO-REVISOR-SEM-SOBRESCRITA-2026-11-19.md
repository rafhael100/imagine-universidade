# UNI C181 — Gerador de pacote editorial sem sobrescrita de revisões

**19/11/2026 · DRAFT · HOLD_NO_GO · somente laboratório**

## Problema reproduzível

O gerador `scripts/build-editorial-review-pack.mjs --out <diretório>` aceitava reutilizar uma pasta já preenchida e escrevia `revisao.csv` com 35 status pendentes, apagando silenciosamente ajustes feitos por revisores no próprio pacote. Era possível confundir nova geração com continuação do trabalho anterior.

## Correção

O destino é validado **antes de gravar qualquer arquivo**: somente diretório novo ou vazio e não simbólico. Pasta existente com qualquer arquivo (incluindo `revisao.csv`, observações ou arquivo oculto) causa falha, sem substituir trabalho anterior. Para nova geração é necessário escolher outra pasta vazia. O comportamento normal de CI, que utiliza diretório temporário novo, permanece intacto.

## Teste

`node scripts/check-editorial-review-pack.mjs` cria o pacote, simula alteração do CSV e tenta gerar novamente no mesmo diretório. Exige código de erro, mensagem sobre destino vazio, CSV idêntico byte a byte e preservação do `LEIA-PRIMEIRO.md`. O primeiro build ainda preserva 10 cursos, 35 aulas e respectivos hashes.

**Não** implica autorização editorial, liberação de acesso, SSO, grants, merge ou deploy. Os 13 gates continuam `NOT_VERIFIED`, decisão `HOLD_NO_GO`; fonte oficial de serviços no Portal [#886](https://github.com/rafhael100/imagine-portal/issues/886) pendente.
