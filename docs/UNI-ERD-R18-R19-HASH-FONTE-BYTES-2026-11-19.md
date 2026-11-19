# UNI ERD-R18–R19 — vínculo por bytes do pacote editorial (DRAFT)

Data: 2026-11-19. Base de laboratório: PR #92, commit `aeac208368df3ce15485341d92dd2a1f36c0489a`. Sem merge, deploy, SSO, grants ou dados de clientes.

## Problema reproduzível

`TextDecoder("utf-8",{fatal:true})` remove por padrão um BOM UTF-8 inicial (EF BB BF) durante a decodificação. O gerador calculava `source_sha256` sobre a *string decodificada* e anunciava o resultado como hash **do arquivo de origem**. Para uma entrada com BOM válido, `sha256(bytes originais) != sha256(texto sem BOM)`. A leitura poderia gerar um pacote cujo manifesto não reproduz o hash do arquivo existente no repositório, enfraquecendo o vínculo verificável com a fonte editorial.

A inconsistência é demonstrável com Node.js, sem acesso externo:

```js
import {createHash} from "node:crypto";
const sha256=x=>createHash("sha256").update(x).digest("hex");
const bytes=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from('{"schema_version":1}')]);
const decoded=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
console.log(sha256(bytes)===sha256(decoded)); // false (comportamento anterior)
```

## Alterações

- **ERD-R18:** o gerador recusa explicitamente BOM na fonte JSON, preserva decodificação UTF-8 fatal e calcula `source_sha256` sobre o `Buffer` original em vez de uma string normalizada.
- **ERD-R18, regressão negativa:** acrescentado cenário no último estágio de pré-validação que antepõe BOM à fonte; exige falha específica e **nenhum arquivo gerado**.
- **ERD-R19:** a auditoria positiva do pacote também calcula o SHA-256 sobre os **bytes originais** e confere a imutabilidade byte a byte após a geração.
- **ERD-R19, QA isolada:** workflow de branch com checkout sem credenciais persistidas, validação de fonte, pacote das 35 aulas, CSV e política de 13 gates, somente dados sintéticos.

## Reprodução para revisão

```sh
node --check scripts/build-editorial-review-pack.mjs
node scripts/check-editorial-pack-preflight.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-editorial-review-validation.mjs
node scripts/check-release-gate-policy.mjs
```

A saída do teste de pré-validação deve informar **7 cenários negativos**, incluindo 1 cenário de BOM e 1 de UTF-8 inválido, sem saída parcial. Os testes positivos devem preservar 10 cursos, 35 aulas, hashes individuais e `PENDING_HUMAN_REVIEW`. A pipeline correta será verificada somente contra a **SHA exata** desta PR.

## Limites e gates

O hash de origem não autentica revisor, não comprova qualidade pedagógica, não representa assinatura digital e não concede acesso ao Portal. Os 35 textos continuam sem aceite editorial humano autenticado. Os 13 gates de `ops/release-gates.json` permanecem `NOT_VERIFIED` com `HOLD_NO_GO`, dependentes também de [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886). Proibidos merge, deploy, mudanças na `main`, VPS, DNS, custos, SSO real, grants e dados de clientes.
