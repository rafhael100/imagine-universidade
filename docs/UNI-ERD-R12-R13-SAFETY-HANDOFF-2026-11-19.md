# UNI ERD-R12/R13 — Visibilidade e integridade do pacote editorial

**19/11/2026 · DRAFT · HOLD_NO_GO.** Recorte independente baseado na HEAD `1db2de55db169419e5f1c7fb32cf431dff2a33f6` da PR #90. Nenhuma alteração em `main`, Portal, VPS, produção, DNS, fornecedores ou dados de clientes.

## Falha reproduzível (ERD-R12)

O gerador offline `scripts/build-editorial-review-pack.mjs` aceitava título ou corpo contendo controles C1, marcação bidirecional e espaços de largura zero. Um texto como `"Aula\u202Ecabeçalho falso"` passava pelo `safeLine` anterior, apesar de poder enganar a leitura visual do documento Markdown. O hash SHA-256 impedia alteração silenciosa de conteúdo, mas **não** impedia exibição enganosa de um conteúdo que já chegasse contaminado à fonte editorial.

A rotina pura `scripts/editorial-text-safety.mjs`, agora chamada diretamente pelo gerador, rejeita controles C0/C1 (exceto LF estrutural no corpo), Unicode de formatação/invisível, caracteres direcionais, separadores U+2028/U+2029, seletores de variação e substitutos UTF-16 isolados. Preserva letras acentuadas legítimas e saltos de parágrafo.

## QA verificável (ERD-R13)

`node scripts/check-editorial-text-safety.mjs` percorre os **10 cursos e 35 textos reais** da fonte versionada, valida títulos/corpos e testa entradas negativas inseridas em um corpo de aula original. Também exercita markdown `|`, strings vazias e texto insuficiente.

Executar em checkout descartável:

```bash
node --check scripts/editorial-text-safety.mjs
node --check scripts/check-editorial-text-safety.mjs
node scripts/check-editorial-text-safety.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-release-gate-policy.mjs
```

A CI exclusiva do draft executa esses comandos sem usar segredos, contas, SSO, serviços externos ou saída de produção. **Até o check da SHA final terminar, não presumir CI aprovada.** Os 35 textos continuam rascunhos sujeitos à avaliação de conteúdo por humanos; não equivale a aceitar clareza, correção factual ou adequação pedagógica.

## Dependências de liberação

Os **13 gates** de `ops/release-gates.json` permanecem `NOT_VERIFIED`; `release_decision=HOLD_NO_GO`. A fonte oficial de serviço vigente, revogação independente e sessão empresarial autenticada continuam pendentes na [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Nem CSV, nem assinatura, nem CI sintética concedem acesso.
