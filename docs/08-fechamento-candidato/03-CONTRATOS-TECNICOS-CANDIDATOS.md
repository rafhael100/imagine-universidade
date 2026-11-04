# Contratos técnicos candidatos — UNI-CT-BASE v0.1
**Natureza:** propostas arquiteturais para ratificação e implementação posterior; NÃO APIs existentes e NÃO códigos contratados.

## Responsabilidades e fronteiras
- **Portal/serviços comerciais:** autenticação, vínculos, situação oficial e regras de elegibilidade; informações de contrato nunca são inventadas pela Universidade.
- **Universidade:** catálogo, conteúdo, trilhas, registros educacionais minimizados e Tutor IA.
- **Serviços centrais:** segurança, auditoria, IA, comunicação e orquestração; `n8n` só coordena, não faz transição de contrato como fonte de verdade.
- **Provedores de conteúdo:** mídia protegida com autorização curta e revisão da elegibilidade.

## Contrato A — Verificação de elegibilidade
Operação lógica `evaluateEducationEntitlement(subject_id, company_id, resource, now)` com resposta tipada:

```json
{
  "decision_id": "uuid",
  "subject_id": "identificador-pseudonimo",
  "company_id": "empresa-123",
  "allowed": true,
  "reason_code": "ELIGIBLE_ACTIVE_SERVICE",
  "entitlement_revision": 42,
  "valid_until": "timestamp-limite",
  "decision_issued_at": "timestamp",
  "source_authority": "PORTAL_IMAGINE"
}
```

`allowed` nunca deriva apenas do menu exibido. A decisão é recusada caso falte autenticação, vínculo, serviço elegível ativo ou permissão ao recurso. A resposta exemplifica um contrato a ser homologado, não uma credencial real.

### Matriz de estados comerciais proposta
| Estado oficial observado | Benefício de Universidade |
|---|---|
| `ACTIVE` e serviço elegível | Sim, se vínculo/autorização válidos |
| `ACTIVE_IN_CONTRACTUAL_GRACE` e o serviço **permanece oficialmente ativo** | Sim enquanto o Portal confirmar atividade; política de tolerância financeira não é criada pela Universidade |
| `SUSPENDED`, `CANCELLED_EFFECTIVE`, `EXPIRED` | Não para aquele serviço |
| `TRIAL_ONLY`, `PENDING_PAYMENT`, `NO_SERVICE` | Não, salvo outro serviço contratado elegível ativo |
| `UNKNOWN`, fonte indisponível, versão inconsistente | Não conceder **nova** autorização; sessões já autorizadas obedecem validade curta e revogação definida |

A nomenclatura exata dos estados deve ser alinhada aos estados oficiais já definidos no Portal/CRM; não criar novos estados comerciais sem sua aprovação.

## Contrato B — Evento versionado
Envelope **candidato** de evento, sem presumir payload comercial real:

```json
{
  "event_id": "uuid-estavel",
  "event_type": "imagine.contract.entitlement_changed",
  "schema_version": "1.0",
  "source": "portal-imagine",
  "tenant_id": "empresa-123",
  "aggregate_id": "direito-456",
  "aggregate_revision": 42,
  "occurred_at": "timestamp",
  "published_at": "timestamp",
  "correlation_id": "uuid",
  "data": {"entitlement_revision": 42, "requires_reconciliation": true}
}
```

Consumidor: idempotência por `source + event_id`, rejeição de revisões antigas, reconciliação com estado oficial em caso de perda, duplicação ou conflito. Confirmação técnica de recebimento não equivale a elegibilidade oficial. Não embutir CPF, documentos ou dados sensíveis sem necessidade.

## Contrato C — Revogação
1. Alteração oficial de contrato/vínculo produz nova revisão de direito.
2. Sistema autorizador valida revisão e invalida cache de elegibilidade.
3. Universidade deixa de emitir credenciais de mídia e de IA.
4. As sessões/token existentes são revogados ou expiram no prazo máximo **a definir e ratificar**.
5. Eventos perdidos/atrasados são reconciliados; reconciliação não reabre direitos sem confirmação oficial.

**Política candidata:** tokens de mídia estritamente curtos, verificação recorrente de elegibilidade antes da emissão, TTL ajustável e bloqueio imediato de novas permissões após revogação confirmada. Duração exata é P0 técnica não resolvida; não inventar SLA de revogação.

## Contrato D — Contexto educacional seguro
- Dados fornecidos por produto: código de módulo, papel autorizado, idioma, versão homologada e contexto estritamente necessário; nenhum lead ou dados financeiros brutos por padrão.
- Tutor IA: consultas somente de conteúdo homologado; sem escrita nos produtos e sem execução de comandos livres.
- Administradores da empresa: indicadores agregados, nunca acesso automático a conversas individuais do Tutor.

## Contrato E — Conteúdo e publicação
Estados: proposta → elaboração → revisão → aprovação competente → homologado → publicado / suspenso / arquivado. Nenhum estado de publicação é inferido apenas da conclusão de geração por IA. Toda versão registra fonte, licença, responsável, data, compatibilidade de versão de produto e motivo da atualização.

## Contrato F — Falhas e contingência
- Falha do Tutor: catálogo estático mantém acesso para autorizações válidas; Tutor indisponível é sinalizado, sem gerar respostas inventadas.
- Falha de identificação/elegibilidade: nenhuma nova concessão de conteúdo restrito.
- Falha de vídeo: oferecer alternativa textual autorizada quando existir.
- Falha de eventos: reconciliação com fonte de verdade e auditoria de divergências.
- Falha de backup: incidente visível, sem declarar sucesso de recuperação antes de teste.

## Versões e homologação
Todos os contratos precisam de schema, protocolo real, autenticação mútua, idempotência, limites, política de retry, testes de concorrência e integração. A escolha de OIDC, OAuth, banco, região ou media provider exige decisão técnica formal e evidência futura.
