# UNI C178 — Importação editorial em UTF-8 estrito

**19/11/2026 · DRAFT / HOLD_NO_GO**

## Falha e correção
No navegador, File.text() pode converter bytes UTF-8 inválidos em U+FFFD sem informar o usuário. A leitura antiga por readFile com encoding utf8 no validador Node faz a mesma substituição. Isso pode corromper silenciosamente observações de uma revisão editorial, fora do hash de origem das aulas.

A leitura é agora feita em bytes (limite de 1 MB no navegador) e validada com TextDecoder("utf-8",{fatal:true}), antes de alterar quaisquer registros. Arquivos malformados são recusados; os formatos UTF-8 válidos com BOM, CRLF, observações multilinha e ponto e vírgula continuam suportados.

## QA
O teste CLI injeta byte UTF-8 incompleto em observação pendente estruturalmente válida e exige erro de decodificação. O Chromium injeta byte malformado em observação previamente revisada, exige mensagem de erro e preservação das duas revisões locais previamente mescladas.

Sem autenticação, acesso de clientes, SSO real, merge, deploy, DNS, VPS, despesas ou alteração dos 13 gates NOT_VERIFIED. Portal #886 continua pendente.
