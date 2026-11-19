# UNI ERD-R26–R27 — integridade do pacote editorial offline

**Data:** 19/11/2026. **Escopo:** PR DRAFT empilhada sobre a #94 na SHA 2183a9a95eae41dffef7ea324dbe046ebddff7d3. **Decisão:** HOLD_NO_GO / NO-MERGE / NO-DEPLOY.

## Problema e implementação

Antes da R26, o pacote de 10 cursos e 35 aulas continha hashes de origem e de aulas, mas não vinculava byte a byte os próprios arquivos exportados: HTML, CSV, fila, instruções e os dez Markdown de cursos.

- **ERD-R26:** a geração cria INTEGRIDADE-PACOTE.json, um manifesto **não assinado** com SHA-256 e tamanho de **15 arquivos**: 10 Markdown, CSV, HTML offline, fila de revisão, instruções e manifesto editorial. O status permanece HOLD_NO_GO.
- **ERD-R27:** o verificador somente leitura confere os 15 arquivos reais, caminhos exatos, unicidade, ausência de extras, nomes permitidos e ausência de links simbólicos e de travessia de diretório. Uma suíte reproduz 13 cenários de corrupção ou troca, em diretórios temporários. O verificador nunca reescreve anotações humanas.
- O construtor continua recusando pacotes não vazios; essa restrição impede descartar revisões locais por acidente.

## Reprodução (Node.js 20+)

~~~bash
node --check scripts/editorial-package-integrity.mjs
node --check scripts/check-editorial-package-integrity.mjs
node --check scripts/verify-editorial-package-integrity.mjs
node scripts/check-editorial-review-pack.mjs
node scripts/check-editorial-pack-preflight.mjs
node scripts/check-editorial-package-integrity.mjs
node scripts/check-release-gate-policy.mjs
TMP="$(mktemp -d)"
node scripts/build-editorial-review-pack.mjs --out "$TMP"
node scripts/verify-editorial-package-integrity.mjs --dir "$TMP"
~~~

Use apenas um destino vazio para gerar um pacote novo. Não utilize um destino com anotações humanas.

## Limite de confiança: checksum não é assinatura

O manifesto detecta corrupção acidental, mas **não prova origem, identidade, autoria, signoff ou segurança contra falsificação**: um agente mal-intencionado pode recalcular todos os hashes após alterar arquivos. Não existe assinatura criptográfica, chave, carimbo confiável ou homologação. As 35 aulas permanecem PENDING_HUMAN_REVIEW.

A issue Portal #886 continua bloqueando serviço ativo oficial, revogação e identidade empresarial; os 13 gates permanecem NOT_VERIFIED, HOLD_NO_GO. Nenhum SSO/grant real, merge, deploy, alteração da main, VPS/DNS, custo ou acesso a clientes.

A PR #85 e as PRs #90–#94 não são modificadas nesta entrega. Qualquer CI deve ser atribuída exclusivamente à SHA exata desta branch, nunca herdada de commit anterior.
