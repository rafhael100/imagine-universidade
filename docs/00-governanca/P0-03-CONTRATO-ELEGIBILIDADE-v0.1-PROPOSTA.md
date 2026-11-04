# P0-03 — Contrato de elegibilidade e revogação de benefício (v0.1)

**Estado:** PROPOSTA TÉCNICA PARA RATIFICAÇÃO. A regra comercial de exclusividade já está funcionalmente aprovada; este documento detalha sua implementação contratual candidata.  
**Data:** 03/11/2026.  
**Autoridade:** Portal Imagine + sistemas oficiais de contratação/identidade. A Universidade é consumidora de direitos, nunca fonte oficial de contratos.  
**Dependências:** UNI-R03-DEC01; GOV-01–06; CT-UNI-01; UNI-R06; P0-04 sessões, P0-06 eventos, P0-05 privacidade e P0-12 critérios de aceite.  
**Fase:** somente documentação; não há endpoints implementados.

## 1. Regras obrigatórias já aprovadas

1. A Universidade é benefício exclusivo de cliente que tenha ao menos **um serviço Imagine contratado, elegível e ativo**.
2. Pessoas vinculadas ao cliente precisam ter identidade autenticada, vínculo empresarial autorizado e permissão específica.
3. **Teste gratuito isolado, cadastro no Portal, login válido, convite não aceito, serviço pendente ou interesse comercial** não conferem o benefício por si só.
4. Se múltiplos serviços contratados concederem elegibilidade, a perda de um preserva acesso enquanto outro estiver ativo e elegível.
5. O cancelamento **efetivo** do último serviço elegível encerra os direitos de acesso a cursos, vídeos, Tutor IA e recursos protegidos, sem implicar destruição instantânea de dados.
6. Um benefício não é duplicado pelo número de serviços ou contratos. Contextos empresariais distintos permanecem isolados.
7. A Universidade não vende cursos avulsos, não abre o catálogo ao público e não altera situação contratual.

## 2. Responsabilidades propostas

| Parte | Responsabilidade | Limite |
|---|---|---|
| Portal / autoridade comercial | Emitir estado oficial do direito derivado de contratos e serviços | Sem transferência da titularidade do contrato à Universidade |
| Identidade / vínculo | Confirmar pessoa, sessão, relação com empresa e permissões | Login sozinho não basta |
| Autorizador central | Calcular direito por `pessoa + empresa + recurso + revisão` a partir de fontes oficiais | Não inferir direito do nome de um plano ou de cache desatualizado |
| Universidade | Conferir decisão de autorização de cada recurso protegido; manter registros educacionais | Não conceder benefícios por conta própria |
| Orquestração/eventos | Propagar mudanças, monitorar falhas e promover reconciliação | n8n não é autoridade de estado |
| Auditoria | Correlacionar decisões relevantes sem coletar excesso de PII | Não expor dados pessoais dos estudantes ao gestor empresarial |

## 3. Operação candidata de autorização (contrato lógico)

Solicitação lógica: `evaluateEducationEntitlement(subject_id, company_id, resource_id, context, request_id)`.

A resposta deve incluir `allowed`, `reason_code`, `decision_id`, `subject_id`, `company_id`, `resource_scope`, `entitlement_revision`, `source_authority`, `issued_at` e `valid_until`.

**Proposta:** a versão do contrato, o método de autenticação entre serviços, o formato JSON/HTTPS, os escopos de recursos e o TTL serão definidos na homologação do contrato P0-04/P0-06. Nenhum nome de endpoint publicado aqui corresponde a API já existente.

A autorização não poderá ser inferida do menu, da URL, de um parâmetro enviado pelo cliente ou de evento técnico desacompanhado de confirmação oficial.

## 4. Matriz funcional de estados e exceções

| Situação oficial verificada | Acesso ao recurso protegido |
|---|---|
| Contrato ativo e serviço elegível, pessoa vinculada e autorizada | Permitido enquanto direito vigente |
| Contrato em tolerância financeira, **ainda oficialmente ativo** | Permitido enquanto a autoridade confirmar atividade e elegibilidade |
| Suspensão efetiva do único serviço elegível | Negado |
| Cancelamento efetivo do único serviço elegível | Negado |
| Cancelamento de um serviço com outro elegível ativo | Permitido |
| Novo contrato elegível oficialmente ativo | Reavaliar e restabelecer acesso conforme revisão oficial |
| Trial sem outro serviço contratado elegível | Negado |
| Usuário sem vínculo, convite pendente ou vínculo revogado | Negado nesse contexto |
| Usuário com vínculo válido em duas empresas | Decisão separada por empresa; nunca mesclar histórico privado |
| Fonte oficial indisponível ou revisão inconclusiva | Nenhuma **nova** concessão; sessões anteriores seguem contrato de revogação P0-04 |
| Evento de ativação atrasado após cancelamento | Não reabrir direito sem consulta da revisão oficial mais recente |
| Evento duplicado | Sem duplicidade de benefício ou mudança indevida de estado |

A nomenclatura exata dos estados comerciais e períodos de tolerância deve ser **mapeada aos contratos já existentes**, não inventada na Universidade.

## 5. Propagação e falhas

- Mudança de contrato ou vínculo cria revisão oficial de direito e evento versionado, identificado e idempotente.
- A Universidade invalida cache de decisões e novas credenciais de conteúdo/IA ao receber revogação confirmada.
- Consumidor rejeita revisões antigas; eventos ausentes, atrasados ou conflitantes exigem **reconciliação com a autoridade oficial**.
- Resposta desconhecida não autoriza novo recurso. A continuidade de sessão já emitida depende dos prazos e mecanismos que forem aprovados em P0-04.
- Registrar decisão, origem, revisão, recurso, empresa e correlação com minimização dos dados pessoais.
- A restabelecimento por recontratação depende de direito vigente; a eventual recuperação de histórico depende de P0-05 e da retenção legalmente válida.

## 6. Critérios de aceite futuros (ainda não testados)

| Teste | Condição verificável |
|---|---|
| HT-UNI-EL01 | Usuário ativo com contrato elegível e permissão acessa recurso autorizado |
| HT-UNI-EL02 | Cadastro/Trial isolado não acessa catálogo restrito |
| HT-UNI-EL03 | Cancelamento de um de dois serviços mantém acesso |
| HT-UNI-EL04 | Cancelamento efetivo do último serviço interrompe novas concessões |
| HT-UNI-EL05 | Vínculo revogado impede acesso no respectivo contexto |
| HT-UNI-EL06 | Troca de empresa não expõe histórico pessoal/empresarial cruzado |
| HT-UNI-EL07 | URL direta, API e vídeo não contornam a autorização |
| HT-UNI-EL08 | Duplicidade e desordem de eventos não reativam direito perdido |
| HT-UNI-EL09 | Fonte indisponível não concede nova autorização |
| HT-UNI-EL10 | Recontratação elegível volta a conceder acesso, respeitando privacidade e retenção |

## 7. Itens que ainda exigem ratificação ou trabalho técnico

1. Mapeamento oficial entre os estados contratuais de Portal/CRM/Sites/Performance AI e o direito de Universidade.
2. Protocolo de identidade e autorização, duração de sessão e mídia e revogação (`P0-04`).
3. Esquema definitivo de API/eventos, assinatura, versionamento, idempotência, retentativas e reconciliação (`P0-06`).
4. Política de retenção e possibilidade de recuperação de dados pessoais após recontratação (`P0-05`).
5. Testes de integração e verificação formal de critérios de aceite antes do lançamento.

**Proposta para aprovação:** ratificar esta matriz como **contrato funcional de elegibilidade**, mantendo detalhes de protocolo e tempo de revogação em P0-04/P0-06.

**Esta minuta não resolve sozinha P0-03 e não autoriza programação.**
