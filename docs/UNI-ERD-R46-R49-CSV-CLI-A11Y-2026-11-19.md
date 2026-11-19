# Universidade Imagine — ERD-R46–R49 (19/11/2026)

**Estado:** PR DRAFT. Pacote offline e CSV não assinados; nenhuma aprovação humana, SSO, grant ou publicação.

## Entregas

- **ERD-R46 — Entrada local sem symlink.** O validador de `--csv` não deve seguir atalhos simbólicos de arquivo ou diretórios ancestrais. Antes, `open(..., "r")` mais `handle.stat()` aceitava um symlink para um CSV válido; agora `lstat()` valida todo o caminho e `O_NOFOLLOW` reduz a janela de substituição do componente final. Não substitui isolamento do sistema de arquivos.
- **ERD-R47 — Limite de bytes efetivo.** O CSV é lido em um buffer limitado a 1.000.001 bytes; falha se exceder 1 MB, inclusive se crescer após o `stat`. A decodificação UTF-8 continua `fatal:true`. O teste positivo usa o CSV gerado das 35 aulas; dois testes negativos cobrem symlink no arquivo e no pai.
- **ERD-R48 — Feedback para tecnologia assistiva.** Mensagens de falha de validação/importação são anunciadas com `role=alert` e `aria-live=assertive`, enquanto as mensagens normais voltam a `role=status` e `polite`. `aria-atomic=true` torna o conteúdo completo anunciado. Não muda a apresentação nem a proteção de alterações locais.
- **ERD-R49 — Evidência verificável.** Teste de estrutura offline e regressões reais em Chromium (erro assertivo e retorno a `status` após correção). Workflow isolado, temporário, sem acesso externo do app, com QA das 35 aulas e 13 gates.

## Comandos no checkout da SHA

```sh
node --check scripts/validate-editorial-review.mjs
node --check scripts/editorial-review-app.js
node scripts/check-editorial-review-validation.mjs
node scripts/check-editorial-offline-review.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
```

**Critérios não cumpridos:** 35 aulas aguardam aceite editorial humano; os 13 gates em `ops/release-gates.json` permanecem `NOT_VERIFIED`, decisão `HOLD_NO_GO`. [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) ainda exige fonte oficial de serviços ativos, revogação independente, identidade empresarial autenticada e autoridade editorial. Testes sintéticos aprovados não liberam operação real.

**Limites:** nenhuma alteração de main, merge, deploy, VPS, DNS, custos, credenciais, contratos, clientes, SSO ou grants.
