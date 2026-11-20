# Imagine Universidade — R124–R126: allowlist estrita no pacote de 35 aulas

**HOLD_NO_GO / DRAFT.** Complementa R120–R123, sem alterar fonte curricular, identidade empresarial, permissões ou aprovações.

## Correção concreta

O verificador anterior lia apenas manifest.json, report.json, report.md e report.html, mas **ignorava anexos extras** colocados na mesma pasta. Isso permitiria transportar indevidamente um texto de falso aceite, um arquivo oculto ou um link simbólico sem que a verificação acusasse o conjunto como inválido.

- **R124:** ao verificar a pasta, exigir lista de nomes exatamente igual à dos quatro arquivos permitidos. Qualquer arquivo oculto, extra ou ausente interrompe o processo.
- **R125:** testes negativos para APPROVED.txt não autenticado, .env sintético, symlink extra, symlink substituindo arquivo obrigatório e manifesto inválido.
- **R126:** CI dedicada read-only, checkout da SHA exata, geração e verificação do pacote em diretório temporário e checagem dos 13 gates.

## Reproduzir sem rede, custo ou clientes

    OUT="$(mktemp -d)"
    node scripts/build-editorial-review-priority.mjs --json > "$OUT/report.json"
    node scripts/build-editorial-review-priority.mjs --markdown > "$OUT/report.md"
    node scripts/render-editorial-priority-html.mjs > "$OUT/report.html"
    node scripts/editorial-review-bundle.mjs > "$OUT/manifest.json"
    node scripts/editorial-review-bundle.mjs "$OUT"
    node scripts/check-editorial-review-bundle.mjs

Para validar a negativa, acrescente um arquivo chamado APPROVED.txt ao diretório temporário e repita o comando de verificação: a execução deverá falhar. Apague o arquivo artificial antes de usar os resultados. Não forneça dados pessoais ou credenciais.

## Limites

Integridade de bytes não é aceite pedagógico, nem homologação do Portal. As 35 aulas / 210 itens de leitura continuam sem assinatura humana. Serviços ativos e revogação independente permanecem bloqueados em https://github.com/rafhael100/imagine-portal/issues/886. **13/13 gates NOT_VERIFIED**, sem SSO real, grants, merge, deploy, alteração de main, VPS, DNS ou custos.
