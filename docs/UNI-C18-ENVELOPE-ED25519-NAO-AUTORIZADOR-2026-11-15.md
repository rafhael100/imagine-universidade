# UNI C-18 — verificador de envelope Ed25519 (somente candidato)

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Por que foi criado

A Universidade já possui backend Laravel 13, 54 testes com PHP 8.3 e PostgreSQL18, mas ainda não existe uma autoridade real de contratos ativos e SSO no Portal. Para preparar a comunicação entre serviços sem introduzir acesso falso, este recorte implementa apenas a **validação criptográfica de uma mensagem futura**, sem rotas e sem alterar o provider padrão.

## Contrato candidato, versão 1

Formato: `uni-v1.<payload-base64url>.<assinatura-base64url>`, sem padding. O emissor Portal futuro assinaria com Ed25519 os bytes ASCII exatos `uni-v1.<payload-base64url>`.

Payload JSON com **exatamente** as chaves: `iss`, `aud`, `kid`, `org`, `sub`, `perm`, `rev`, `iat`, `exp`, `nonce`.

Restrições:
- `iss=imagine-portal` e `aud=imagine-universidade`, chaves públicas fixadas por `kid` no backend, nunca fornecidas pelo navegador.
- `org` deve coincidir com a empresa esperada do contexto **server-side**; `perm` é exatamente `university:view` ou `university:manage`, sem equivalência entre elas.
- `rev` é inteiro positivo; `iat` no máximo 30 segundos anterior ao relógio da verificação; `exp` no futuro e até 60 segundos adiante; nonce hexadecimal de 128 bits.
- Proibir campos extras, tipos incorretos, codificação ambígua, claims para outra aplicação, assinatura inválida e chave desconhecida.
- Retornar um `PortalSignedClaimCandidate` apenas após assinatura criptograficamente válida, sem incluir segredos.

**A assinatura válida NÃO é autorização.** O verificador não estabelece sessão, autenticidade do serviço de faturamento, elegibilidade contratual, revogação, impossibilidade de replay ou autorização de recurso. O objeto resultante sempre devolve `mayAuthorizeAccess()=false`. O provider `UnavailablePortalAuthority` da Universidade segue inalterado e nega qualquer acesso normal.

Para uso operacional futuro são obrigatórios: emissor autenticado e auditado, chave privada gerida com rotação, requisições backend-to-backend sobre TLS autenticado, associação a sessão business e tenant, consulta transacional de contrato ativo/revisão, verificação de revogação a cada requisição e rejeição/retenção de nonce conforme o protocolo final. Nada disso foi ativado aqui.

## Testes

`tests/Unit/PortalSignedEnvelopeVerifierTest.php` utiliza pares de chaves **aleatórios e sintéticos** criados no próprio processo de teste. Casos: assinatura válida sem autoridade, chave ausente/errada, payload modificado, emissor/audiência/empresa/permissão incorretos, expiração, skew do relógio, revisão inválida, campos extras e entradas malformadas.

O GitHub Actions de homologação instala extensão `sodium` e o Dockerfile de QA instala `libsodium-dev` para executar a mesma suíte.

## Gate

A integração Portal permanece bloqueada no [Portal #848](https://github.com/rafhael100/imagine-portal/issues/848). A fonte oficial de contratos ativos não foi identificada nem homologada. Este envelope é **somente um candidato de protocolo, não um JWT, SSO pronto ou emissor de grants**.

**Não houve deploy, alteração da main, dados reais, segredos ou permissões concedidas.**


## Vetor criptográfico compartilhado (somente teste)

Os repositórios Portal e Universidade contêm o mesmo arquivo público `uni-v1-ed25519-public-vector.json` em seus diretórios `tests/Fixtures`. SHA-256 do conteúdo **b6925128a7d66efe1e304710d085d51c5e854215230fa0f02505d201b4381e7c**.

O vetor foi assinado localmente com um par de chaves sintético efêmero; **somente a chave pública e a mensagem assinada foram versionadas**. A chave privada não foi publicada nem reutilizada. Os testes verificam a assinatura e a separação de domínio `uni-v1.`, sem conceder grants ou credenciais. A igualdade do SHA nos dois repositórios impede divergência silenciosa no contrato.
