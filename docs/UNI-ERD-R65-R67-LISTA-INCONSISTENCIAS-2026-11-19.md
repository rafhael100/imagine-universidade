# UNI ERD-R65–R67 — lista navegável de inconsistências editoriais (19/11/2026)

**Origem:** PR [#104](https://github.com/rafhael100/imagine-universidade/pull/104) HEAD `49b6065772b8bb31767663b54183d066138551a5`, somente laboratório offline. Esta implementação é empilhada em outra branch DRAFT e **não publica nem aprova aulas**.

## R65 — todas as inconsistências, foco acessível

Além do resumo e do botão para o primeiro erro, uma verificação explícita mostra até **35 registros** inconsistentes como uma lista de botões acessíveis por teclado. Cada item identifica a aula pelo título já versionado, sua posição e a regra local violada; a lista é construída com `createElement` e `textContent`, nunca HTML interpretado de observações ou nome de revisor. Ao ativar um item, a pessoa revisora vai diretamente ao título da aula.

Uma alteração de status, revisor, evidência, observações ou importação efetiva destrói a lista anterior; isso impede a apresentação de erros antigos como se ainda refletissem o rascunho atual. A lista não registra dados em armazenamento, não envia eventos, não autentica identidade e não concede acesso.

## R66 — regressões em Chromium

Testes reais sobre `file://` criam dois registros inválidos, confirmam lista e ordem, navegam pelo teclado com Enter e garantem foco no título. Um texto de observação com aparente tag HTML é tratado como texto; a interface nunca usa `innerHTML` com a entrada. Testes anteriores de 35 aulas, importação/exportação, WCAG e política de segurança continuam aplicáveis.

## R67 — workflow isolado

`.github/workflows/uni-erd-r65-r67-audit-errors-qa.yml`: execução por push apenas nesta branch de revisão, checkout sem persistência de credenciais, scripts sintéticos, integridade de pacote e 13 gates, testes Chromium e Axe usando Chrome disponível no runner. A CI só pode ser marcada como aprovada após verificar a **SHA exata**, ambos os jobs e seus resultados.

**Bloqueios:** 13/13 gates em `NOT_VERIFIED`, decisão `HOLD_NO_GO`; [Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) sem fonte oficial de contratos e revogação, identidade empresarial e autorização editorial homologadas; 35 aulas dependem de aceite humano autenticado. `UnavailablePortalAuthority` permanece deny-all. Nenhum merge, deploy, mudança em main/VPS/DNS, custo, SSO, grant real ou uso de dados de clientes.
