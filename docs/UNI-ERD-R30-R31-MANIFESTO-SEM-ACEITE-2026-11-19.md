# UNI ERD-R30–R38 — invariantes e vínculo à fonte editorial offline

**19/11/2026 · PR DRAFT sobre #95 na SHA `38e4f8d57a2845074dd867603de0574abc1d2691`.**

## Problema reproduzível

O verificador anterior conferia os 15 arquivos e seus checksums, mas validava apenas a quantidade de 10 cursos e 35 aulas no manifesto. Um `manifesto-revisao.json` contraditório (por exemplo, aula marcada como `APPROVED`, revisor preenchido, identidade duplicada ou quantidade por curso divergente) poderia passar se os hashes *não assinados* fossem recalculados. Nenhuma assinatura de origem, autorização de acesso ou aceite pedagógico é presumida.

## Entregas

- **R30:** o verificador passa a exigir fonte versionada fixa, curso único, categoria permitida, títulos/identidades válidos, nomes de arquivo numerados ligados ao `course_slug`, contagens por curso reconciliadas com as 35 identidades de aulas, hash por aula válido, e estados estritamente pendentes sem nomes ou evidências de aprovação.
- **R31:** 10 testes negativos criam cópias descartáveis do pacote, adulteram os campos do manifesto e **recalculam corretamente o checksum** do próprio arquivo no manifesto de integridade. Os testes demonstram que uma estrutura contraditória é recusada *mesmo quando* o SHA-256 do pacote bate; são **26 cenários negativos** no primeiro lote.
- **R32:** com a opção `--source`, o verificador agora compara nomes, categorias, quantidades e ordem dos cursos, além da identidade e do SHA-256 **recomputado de cada uma das 35 aulas a partir do título e corpo originais**. A verificação `--dir` continua disponível para integridade local sem fonte, mas não afirma esse vínculo.
- **R33:** mais 4 regressões produzem pacotes com checksums recalculados e estrutura formalmente válida, mas cursos/aulas com título, hash, identidade ou ordem divergentes. O `--dir` aceita a consistência local e o `--source` deve recusar. Total até R33: **30 cenários negativos**.
- **R34:** quando `--source` é solicitado, o CSV de revisão também precisa corresponder byte a byte ao CSV pendente construído a partir da fonte original. Isto impede que um pacote localmente re-hashado anuncie `APPROVED`, revisor ou evidência falsos no CSV e ainda passe pela verificação contra a fonte.
- **R35:** quatro regressões re-hasham CSV adulterado (status `APPROVED`, nome de revisor, checksum da aula e linha extra), comprovam que `--dir` é autoconsistente e que `--source` nega o vínculo. Total agora: **34 cenários negativos**.
- **R36:** com `--source`, a página HTML navegável deve corresponder byte a byte à renderização determinística do mesmo currículo e dos mesmos scripts locais versionados; um pacote com script injetado ou título enganoso, mesmo re-hashado, falha.
- **R37:** com `--source`, a fila de revisão das 35 aulas deve corresponder à fila determinística derivada dos bytes originais, inclusive `HOLD_NO_GO` e estados pendentes.
- **R38:** mais quatro regressões re-hasham duas alterações no HTML e duas alterações na fila. Em todos os casos, `--dir` verifica consistência de arquivos e `--source` recusa a alteração. Total: **38 cenários negativos**.

**Nota de reprodutibilidade:** a checagem `--source` da página HTML utiliza também o código versionado do renderizador e do navegador editorial desta revisão. A combinação de currículo e código da versão de origem é necessária; mudanças legítimas futuras no renderizador exigem gerar pacote novo em diretório vazio, sem sobrescrever anotações humanas.

## Reprodução sem clientes, VPS ou serviços externos

```bash
node --check scripts/editorial-package-integrity.mjs
node --check scripts/check-editorial-package-integrity.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
# Com pacote gerado em diretório temporário vazio:
# node scripts/verify-editorial-package-integrity.mjs --dir "$TMP" --source content/mvp-cursos-v1.json
```

A execução utiliza somente `content/mvp-cursos-v1.json` e diretórios temporários. O check final **não deve** afirmar aceite de nenhuma das 35 aulas ou sucesso de homologação operacional. O verificador continua somente leitura, sem alterar relatórios ou revisões da equipe humana. **Importante:** `--source` verifica a exportação original, não um CSV posteriormente preenchido pela equipe humana. Preserve as revisões em cópia separada; modificações legítimas no CSV deixam de corresponder ao handoff original.

## Limites e liberação

Esta validação de consistência **não autentica a procedência**: quem controla um pacote não assinado pode recriar arquivos, informações e hashes de modo internamente coerente. O aceite humano permanece externo, por responsável identificado e hash da aula.

**HOLD_NO_GO; 13/13 gates NOT_VERIFIED.** A issue `rafhael100/imagine-portal#886` ainda exige contrato/serviço ativo de autoridade autenticada, revogação independente e identidade empresarial. A `main` e a PR #85 não são modificadas. Sem merge, deploy, VPS/DNS, custo, SSO, grants ou dados de clientes.
