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


## Integridade antes da escrita (ERD-R14/R15)

Na versão original do gerador, um título ou corpo inválido encontrado **somente na última aula** podia provocar erro após arquivos Markdown de cursos anteriores terem sido escritos. Isso deixava um pacote editorial parcial e potencialmente enganoso.

A nova função `preflightReviewSource(payload.courses)` percorre **todos** os cursos e suas aulas, valida identidade e unicidade de slugs, categoria, tamanho, título e corpo antes de criar qualquer arquivo de conteúdo. A pré-validação não altera texto, hashes ou situação editorial.

O teste executável `scripts/check-editorial-pack-preflight.mjs` usa uma cópia temporária e descartável da fonte para simular cinco falhas tardias: corpo com controle bidi, título C1, título com newline, aula final muito curta e curso final com slug duplicado. Cada falha exige saída diferente de zero e **zero arquivos** no diretório de saída recém-criado. Tudo ocorre fora da fonte original e sem servidor, banco, credenciais ou publicação.

```bash
node --check scripts/check-editorial-pack-preflight.mjs
node scripts/check-editorial-pack-preflight.mjs
```

O limite restante é operacional: a proteção contra alterações concorrentes de arquivos de sistema entre a pré-validação e a escrita dependeria de garantias adicionais de filesystem. Nesta PR, a fonte curricular permanece um arquivo versionado do checkout descartável, e o destino é exclusivamente temporário/vazio.

## Dependências de liberação

Os **13 gates** de `ops/release-gates.json` permanecem `NOT_VERIFIED`; `release_decision=HOLD_NO_GO`. A fonte oficial de serviço vigente, revogação independente e sessão empresarial autenticada continuam pendentes na [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Nem CSV, nem assinatura, nem CI sintética concedem acesso.
