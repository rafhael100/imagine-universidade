# UNI ERD-R30–R31 — invariantes do manifesto editorial offline

**19/11/2026 · PR DRAFT sobre #95 na SHA `38e4f8d57a2845074dd867603de0574abc1d2691`.**

## Problema reproduzível

O verificador anterior conferia os 15 arquivos e seus checksums, mas validava apenas a quantidade de 10 cursos e 35 aulas no manifesto. Um `manifesto-revisao.json` contraditório (por exemplo, aula marcada como `APPROVED`, revisor preenchido, identidade duplicada ou quantidade por curso divergente) poderia passar se os hashes *não assinados* fossem recalculados. Nenhuma assinatura de origem, autorização de acesso ou aceite pedagógico é presumida.

## Entregas

- **R30:** o verificador passa a exigir fonte versionada fixa, curso único, categoria permitida, títulos/identidades válidos, nomes de arquivo numerados ligados ao `course_slug`, contagens por curso reconciliadas com as 35 identidades de aulas, hash por aula válido, e estados estritamente pendentes sem nomes ou evidências de aprovação.
- **R31:** 10 testes negativos criam cópias descartáveis do pacote, adulteram os campos do manifesto e **recalculam corretamente o checksum** do próprio arquivo no manifesto de integridade. Os testes demonstram que uma estrutura contraditória é recusada *mesmo quando* o SHA-256 do pacote bate; são **26 cenários negativos** no total da suíte de integridade.

## Reprodução sem clientes, VPS ou serviços externos

```bash
node --check scripts/editorial-package-integrity.mjs
node --check scripts/check-editorial-package-integrity.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
```

A execução utiliza somente `content/mvp-cursos-v1.json` e diretórios temporários. O check final **não deve** afirmar aceite de nenhuma das 35 aulas ou sucesso de homologação operacional. O verificador continua somente leitura, sem alterar relatórios ou revisões da equipe humana.

## Limites e liberação

Esta validação de consistência **não autentica a procedência**: quem controla um pacote não assinado pode recriar arquivos, informações e hashes de modo internamente coerente. O aceite humano permanece externo, por responsável identificado e hash da aula.

**HOLD_NO_GO; 13/13 gates NOT_VERIFIED.** A issue `rafhael100/imagine-portal#886` ainda exige contrato/serviço ativo de autoridade autenticada, revogação independente e identidade empresarial. A `main` e a PR #85 não são modificadas. Sem merge, deploy, VPS/DNS, custo, SSO, grants ou dados de clientes.
