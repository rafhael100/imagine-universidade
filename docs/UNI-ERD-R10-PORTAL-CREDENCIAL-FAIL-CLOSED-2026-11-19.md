# UNI ERD-R10 — validação fail-closed de credencial do Portal (teste sintético)

**19/11/2026 · DRAFT · NO-MERGE / NO-DEPLOY · HOLD_NO_GO**

Lacuna: o gate recusava controles ASCII C0/DEL no identificador da sessão, mas aceitava espaços, bytes C1 e caracteres Unicode invisíveis/bidirecionais **antes de consultar** o adaptador da autoridade Portal. A credencial servidor-servidor deve ser um token ASCII opaco imprimível, sem espaços (bytes 0x21 a 0x7E); nada no browser pode emitir grants.

O código agora rejeita tais caracteres **antes** de acionar a autoridade. A regressão unitária negativa foi estendida com espaço ASCII, C1 NEL/CSI, U+200B, U+202E e byte inválido 0xFF, verificando ainda o contador do mock (zero chamadas). Nova regressão positiva cobre token de laboratório com pontuação ASCII permitida. O adaptador padrão `UnavailablePortalAuthority` continua deny-all, sem SSO, sem ligação com Portal real ou contratos.

Escopo da validação: testes de laboratório em PHP/ PHPUnit na SHA exata, sem acesso a cliente, VPS, credenciais ou integrações externas. Esta PR não muda a política de 13 gates (`NOT_VERIFIED`, `HOLD_NO_GO`) nem satisfaz a fonte oficial de serviço ativo e revogação exigidas em https://github.com/rafhael100/imagine-portal/issues/886.

**Nota de contrato:** uma futura autoridade real deve produzir uma credencial opaca ASCII dentro desse formato; mudança dessa premissa exige revisão AppSec e novos testes, jamais afrouxamento silencioso do filtro.
