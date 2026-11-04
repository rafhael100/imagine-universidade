# P0-06 — Contratos de integração, identidade, APIs e eventos (v0.1)

**Estado vigente:** **DESENHO-BASE APROVADO EM 03/11/2026**, conforme [decisão P0-06](DECISAO-UNI-P0-06-INTEGRACOES-2026-11-03.md). Interfaces e provedores reais não foram implementados nem homologados; integração depende dos sistemas oficiais e autorização de programação separada.  
**Data:** 03/11/2026.  
**Autoridade e dependências:** decisões funcionais P0-03 (elegibilidade), base técnica P0-04 (sessões/revogação) e política-base P0-05 (privacidade); contratos e estados oficiais existentes do Portal/CRM prevalecem.  
**Escopo:** interfaces lógicas entre Universidade, Portal/identidade, comercial, serviços compartilhados e mídia. Não cria endpoints, credenciais ou eventos reais em produção.

## 1. Fronteiras de autoridade

| Subsistema | Fonte de verdade | O que NÃO pode fazer |
|---|---|---|
| Portal Imagine / identidade central | Pessoa, autenticação, vínculo com empresa, permissões administrativas conforme serviços oficiais | Universidade não mantém base própria de senhas nem altera identidade central |
| Serviço comercial competente | Serviços contratados, elegibilidade, vigência, suspensão e cancelamento efetivo | Universidade não confirma pagamento nem cria benefícios comercialmente |
| Universidade | Catálogo, cursos, trilhas, conteúdo homologado, retomada e dados pedagógicos lícitos | Não opera CRM, sites, faturamento nem suporte |
| Serviço central de IA | Catálogo de modelos, políticas de segurança e consumo, aprovação de modelos | Tutor não invoca ferramentas de escrita nos produtos |
| Serviços de suporte e comunicação | Chamados e envio de mensagens oficiais | Universidade não cria segundo estado oficial de chamado |
| n8n / filas | Coordenação e execução técnica de workflows | Processamento de evento não altera estado contratual como autoridade |
| Provedor de mídias/objetos | Distribuição de arquivo protegido sob credencial válida | Link concedido não substitui decisão de direito do autorizador |

**Invariante:** toda operação educacional protegida valida `pessoa + vínculo + empresa + recurso + permissão + elegibilidade + revisão` no backend. Os campos do cliente são **informativos**, nunca autorização.

## 2. Contratos lógicos a versionar

| Contrato | Operação lógica candidata | Emissor / consumidor | Resultado autoritativo |
|---|---|---|---|
| UNI-C01 Identidade | Obter sessão e contexto de vínculo verificados | Identidade central → Universidade | Identidade e escopo confirmados ou negados |
| UNI-C02 Elegibilidade | `evaluateEducationEntitlement(subject_id, company_id, resource_id, request_id)` | Portal/autoridade comercial → autorizador/Universidade | `allowed`, `reason_code`, `revision`, `valid_until`, `decision_id` |
| UNI-C03 Mudança de direito | Evento `entitlement_changed` com revisão | Comercial → barramento → autorizador | Notificação que dispara reavaliação; NÃO é concessão automática |
| UNI-C04 Vínculo revogado | Evento de alteração de usuário/empresa | Identidade central → autorizador/Universidade | Negar novos acessos ao contexto após confirmação |
| UNI-C05 Conteúdo | Obter versão homologada e permissão | Universidade → serviços de entrega | Material permitido e compatível com versão do produto |
| UNI-C06 Mídia privada | Conceder credencial para `resource_id` | Universidade/autorizador → provedor mídia | Token/URL de escopo e duração limitados |
| UNI-C07 Tutor IA | Solicitação de orientação com curso, tópico e contexto mínimo | Universidade → governança de IA | Orientação educacional; nenhuma escrita em produtos |
| UNI-C08 Auditoria | Registrar decisão, evento e correlação mínimos | Cada sistema → auditoria competente | Evidência técnica, não estado comercial |

**A interface final deve vincular contratos oficiais reais do Portal/CRM e não inventar enumerações comerciais.**

## 3. Autenticação, serviço a serviço e segurança

**Proposta de padrão:** OIDC com OAuth 2.0 Authorization Code + PKCE para login humano no provedor central, com backend-for-frontend (BFF) e sessões adequadas a P0-04. Para chamadas de serviço, usar identidade de máquina com escopo mínimo, credencial curta, restrição de audiência e canal TLS; avaliar mTLS/DPoP ou mecanismo equivalente conforme provedor suportado.

- Rejeitar credencial expirada, aud/audience inválida, emissor desconhecido, permissão incompatível, vínculo revogado e token de outro serviço/empresa.
- Não reutilizar token do CRM como token universal para acessar mídia ou Tutor; a Universidade emite credencial específica após verificação.
- Identificar `correlation_id` e `request_id` sem registrar tokens e sem armazenar PII dispensável.
- Autenticação não implica autorização de recurso. UI e menus não são limites de segurança.
- Respostas de erro devem distinguir `UNAUTHENTICATED`, `FORBIDDEN`, `ENTITLEMENT_UNAVAILABLE`, `REVISION_CONFLICT`, `RATE_LIMITED` e `TEMPORARILY_UNAVAILABLE` sem vazar detalhes comerciais.
- Nenhum segredo de serviço deve ser enviado pelo navegador ao n8n ou embutido em assets estáticos.

Referência técnica de desenho: [IETF RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700). O protocolo real precisa ser homologado pelo responsável da identidade Imagine.

## 4. Envelope de eventos — sugestão compatível com CloudEvents

Formato de referência (exemplo **não operacional**):

```json
{
  "specversion": "1.0",
  "id": "event-uuid-estavel",
  "source": "/imagine/portal/entitlement",
  "type": "br.imagine.entitlement.changed.v1",
  "subject": "entitlement/right-reference",
  "time": "2026-11-03T23:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "schema_version": "1.0",
    "tenant_id": "empresa-id-pseudonimo",
    "aggregate_id": "right-id",
    "aggregate_revision": 42,
    "correlation_id": "trace-id",
    "requires_reconciliation": true
  }
}
```

- Adotar a unicidade de `source + id`, versão de payload, revisão monotônica por agregado e chave de contexto; formato final e nomes são para ratificação.
- Evitar CPF, endereço, dados financeiros, conversas e anexos em eventos de elegibilidade.
- Eventos devem informar que **algo mudou**; o autorizador consulta a autoridade se o estado não for suficiente para decisão segura.
- Alterações incompatíveis de estrutura exigem nova versão e período de migração controlado.
- A proposta de envelope se inspira na [CloudEvents Specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md), mas **não declara conformidade já testada**.

## 5. Idempotência, concorrência e causalidade

1. O produtor usa padrão equivalente a **transactional outbox** para não perder eventos depois do commit oficial.
2. O consumidor mantém **inbox idempotente** com deduplicação por `source + id`; sucesso técnico de entrega NÃO significa aprovação comercial.
3. Antes de aplicar efeito, verificar `aggregate_revision` e contexto. Revisões antigas não podem reabrir direito; revisões iguais duplicadas não aplicam efeitos novamente.
4. Concorrência simultânea para mesma empresa/agregado utiliza controle otimista ou serialização equivalente para evitar atualizações fora de ordem.
5. Comando com efeitos de escrita seguros deve ter `idempotency_key` no escopo correto: `tenant + operation + resource + request`; não usar somente chave global sem contexto.
6. Retentativa é permitida apenas quando semanticamente segura; exigir política de timeout, backoff/jitter, limite e reconciliação antes de repetir ações de efeito incerto.
7. Registrar `UNKNOWN` quando não existe confirmação oficial; não classificar timeout como sucesso ou fracasso comercial definitivo.
8. Ninguém deve prometer *exactly-once delivery* físico. Projetar **at-least-once + efeitos idempotentes** para eventos e ações.

## 6. Reconciliação e falhas

| Falha | Comportamento obrigatório |
|---|---|
| Autoridade de contratos indisponível | Não emitir **nova** concessão sem decisão vigente válida; respeitar P0-04 |
| Evento duplicado | Ignorar duplicidade de efeito, manter auditoria de tentativas |
| Evento antigo chega após revogação mais nova | Rejeitar revisão antiga e consultar fonte oficial se necessário |
| Evento não chega | Conciliação periódica de direitos, com detecção de divergências e alerta |
| Reativação após cancelamento | Exigir revisão oficial nova; nunca reativar pelo evento isolado |
| Fonte retorna `UNKNOWN` ou conflito de versões | Negar nova autorização, registrar incidente e reconciliar |
| Serviço de vídeo indisponível | Disponibilizar alternativa textual homologada quando houver e com direito válido |
| Tutor IA indisponível | Mostrar material educacional estático autorizado, sem fingir resposta de IA |
| Dados educacionais inconsistentes | Isolar operação, registrar trilha de correção; não alterar contratos |
| Operações cruzadas de diferentes empresas | Rejeitar contexto e manter isolamento |

**Meta P0-04 já aprovada como base:** bloquear novas concessões em até 60 segundos de propagação após mudança oficial, sujeito a medição e homologação. Não é promessa de interromper vídeo previamente autorizado nesse período.

## 7. Política de compatibilidade e versionamento

- Versão semântica de contrato, catálogo de endpoints/payloads e documentação com responsável.
- Mudança compatível: acrescentar campos opcionais, manter leitores tolerantes a campos novos e validar campos obrigatórios.
- Mudança incompatível: nova versão e plano de coexistência; clientes antigos não devem interpretar estado desconhecido como `ACTIVE`.
- `effective_at` da regra comercial não deve ser substituído por `received_at` técnico.
- Auditoria precisa distinguir estado observado, revisão, tentativa, confirmação e conflito, sem vazar dados pessoais.
- Revisões, rollback e reconciliação são controlados e registrados. n8n não é banco de dados oficial.

## 8. Critérios de aceite futuros — não executados

| ID | Teste de integração esperado |
|---|---|
| HT-UNI-INT01 | Sessão humana com identidade e vínculo válidos utiliza protocolo homologado |
| HT-UNI-INT02 | Token com emissor/audiência/escopo inválidos é rejeitado |
| HT-UNI-INT03 | Contrato comercial ativo permite acesso dentro de permissões |
| HT-UNI-INT04 | Falha da fonte oficial não concede novos direitos |
| HT-UNI-INT05 | Cancelamento efetivo do último contrato revoga novas concessões |
| HT-UNI-INT06 | Serviço adicional ativo preserva benefício sem duplicar registros |
| HT-UNI-INT07 | Evento duplicado só produz efeito idempotente |
| HT-UNI-INT08 | Evento de revisão antiga não sobrepõe nova |
| HT-UNI-INT09 | Reconciliação detecta evento perdido e corrige divergência |
| HT-UNI-INT10 | Reativação sem estado oficial válido é negada |
| HT-UNI-INT11 | Credencial de empresa A não acessa recurso da empresa B |
| HT-UNI-INT12 | Mídia/Tutor aplicam autorização independente do menu |
| HT-UNI-INT13 | Um timeout gera estado inconclusivo auditável, sem falso sucesso |
| HT-UNI-INT14 | Atualização de versão mantém compatibilidade ou faz migração controlada |
| HT-UNI-INT15 | Atraso de revogação T1→T3 é medido e comparado com meta P0-04 |

## 9. O que esta aprovação NÃO resolveria automaticamente

- Não define URLs reais, proprietários finais das APIs, certificados, DNS, endpoints ou fornecedores.
- Não altera enumerações comerciais, direitos ou mecanismos atuais do Portal/CRM.
- Não implica que serviços já existentes suportem OIDC, CloudEvents, outbox ou mTLS; o contrato poderá precisar de adaptação formal.
- Não homologa tecnologia, custo, disponibilidade, região de dados ou infraestrutura; P0-09/P0-10 permanecem.
- Não substitui política LGPD, testes, pentest, pilotos ou autorização de programação.

## 10. Pedido de ratificação

Recomenda-se aprovar **este desenho técnico e os contratos lógicos UNI-C01 a UNI-C08** como base de projeto. Protocolo exato, campos, autenticação de máquina, estados comerciais e formatos de API serão confrontados com os sistemas oficiais durante o fechamento arquitetural antes da implementação e submetidos a nova decisão caso haja mudança material.

**P0-06 está aberto até aprovação expressa. Nenhuma programação autorizada.**
