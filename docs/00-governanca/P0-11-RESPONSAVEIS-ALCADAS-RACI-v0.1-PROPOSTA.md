# P0-11 — Governança de responsáveis, alçadas, permissões e matriz RACI

**Data:** 04/11/2026.  
**Estado:** **APROVADA COMO MATRIZ FUNCIONAL DE PLANEJAMENTO EM 04/11/2026**, conforme [DEC-UNI-P0-11](DECISAO-UNI-P0-11-GOVERNANCA-2026-11-04.md). Atribuições nominais, valores financeiros e implementação permanecem pendentes.  
**Produto:** Universidade Imagine, parte do ecossistema Imagine.  
**Objetivo:** definir quem pode preparar, revisar, autorizar, executar, suspender e auditar ações, respeitando uma operação inicial enxuta e isolada dos dados de outras empresas.  
**Referências vigentes:** P0-03 a P0-09 aprovados como bases; P0-10 aprovado **somente como metodologia financeira** (orçamento definitivo pendente). Opção B permite programação paralela apenas depois do encerramento documental e autorização específica.

## 1. Princípios de governança

1. **Responsável institucional da Imagine** mantém autoridade final de escopo, abertura/encerramento de fases, autorizações de implementação, orçamento e aceite de lançamento.
2. **Papéis funcionais, não nomes presumidos:** propor funções e seus limites agora; registrar titulares e substitutos identificáveis antes da operação real, sem inventar contratações, cargos existentes ou pessoas.
3. **Menor privilégio e segregação de funções:** o agente que produz conteúdo não aprova publicação crítica; o usuário técnico que pede acesso privilegiado não o concede automaticamente; confirmação técnica não equivale a aprovação de negócio.
4. **Equipe enxuta é permitida:** uma pessoa pode acumular funções quando houver capacidade e registro de conflito de interesse. Nos atos de alto risco, exigir revisão adicional independente da própria ação, escalonamento à direção ou suspensão até haver segunda revisão qualificada.
5. **Atribuição humana nominal antes de produção/piloto:** todas as funções essenciais precisam de responsável, canal de contato, substituto possível, disponibilidade e evidência de aceite. Não preencher automaticamente com IA.
6. **Aprovação financeira diferente da técnica/editorial:** um serviço aprovado tecnicamente não está autorizado a gerar despesa. Não supor tetos financeiros ainda não definidos no P0-10.
7. **IA não é autoridade decisória autônoma** para contratos, pagamentos, credenciais, publicação crítica, restauração destrutiva, exclusão de dados pessoais ou lançamento.
8. **Registro auditável:** para atos relevantes, guardar solicitação, responsável, escopo, justificativa, versão, avaliação de risco, decisão e execução. Evidências técnicas nunca conferem permissão por si sós.

## 2. Papéis institucionais propostos

| Sigla | Papel funcional | Responsabilidades principais | Não recebe automaticamente |
|---|---|---|---|
| DIR | Direção / responsável institucional Imagine | Aprovação final de escopo, autorização de programação, contratação, orçamento e Go/No-Go | Execução sem rastreabilidade ou dispensa de controles legais |
| PRD | Gestão de produto Universidade | Priorização, critérios de aceite, catálogo de entregáveis e coordenação entre sistemas | Estado oficial de contratos do Portal |
| PED | Curadoria e coordenação pedagógica | MIA, linguagem, inclusão, qualidade de cursos e revisão editorial | Privilégio de publicação sem fluxo ou dados comerciais |
| TEC | Responsável técnico de arquitetura | Integração, desenho de APIs, deploy, backups, testes e resposta técnica | Aprovação financeira implícita |
| SEG | Segurança da informação | IAM, isolamento, segredos, incidentes, testes de segurança, suspensão preventiva | Acesso irrestrito aos chats de alunos |
| PRI | Privacidade/LGPD | Finalidades, bases legais, retenção, direitos dos titulares, fornecedores e transferências | Acesso indiscriminado a conteúdo pessoal |
| FIN | Financeiro / compras | Cotações, despesas, limites aprovados, conferência de faturas, orçamento e autorizações | Definir conteúdo técnico ou pedagógico sozinho |
| OPS | Operação, suporte e comunicação | Monitoramento, incidentes, atendimento institucional, tarefas e reporte | Corrigir contratos comerciais na Universidade |
| AGT | Agentes IA | Rascunhos, sugestões, classificação e ações técnicas tipadas autorizadas | Autonomia para aprovar sua própria publicação, elevar privilégios ou liberar despesas |

Em equipe pequena, DIR/PRD/FIN ou TEC/SEG podem acumular funções **com controle compensatório**, desde que os atos críticos não tenham aprovação exclusivamente pela própria pessoa executora sem revisão, registro e exceção formal.

## 3. Matriz RACI de planejamento

**Legenda:** A = accountable, autoridade final única daquela decisão; R = executa/prepara; C = consultado; I = informado. A matriz não concede acesso a sistemas nem altera as fontes oficiais.

| Atividade | A | R | C | I |
|---|---|---|---|---|
| Escopo, prioridades e fechamento de planejamento | DIR | PRD | PED, TEC, FIN, SEG, PRI | OPS |
| Autorização de início de programação | DIR | PRD | TEC, SEG, FIN | PED, OPS |
| Contratação, orçamento e alçadas monetárias | DIR | FIN | TEC, PRI, SEG, PRD | OPS |
| Arquitetura, integrações e compatibilidade com Portal/CRM | TEC | TEC | PRD, SEG, PRI, autoridade oficial externa | DIR, OPS |
| Aprovação editorial de curso | PED | PED / revisor técnico de produto | PRD, PRI, SEG quando cabível | OPS |
| Publicação de conteúdo homologado | PED | OPS / serviço autorizado | TEC e responsável técnico de produto | PRD, DIR |
| Mudanças críticas em permissões ou segredos | SEG | TEC | PRI, DIR conforme risco | OPS |
| Bases legais, retenção e direitos de titulares | PRI | PRI / OPS no atendimento | SEG, TEC, PRD | DIR |
| Acionamento de incidente de segurança | SEG | TEC / OPS | PRI, DIR | PRD |
| Restauração de dados em produção | TEC | TEC / OPS | SEG, PRI (se dados pessoais), DIR para perda relevante | PRD |
| Custos de IA e interrupção por teto aprovado | FIN | TEC / OPS | PRD, SEG | DIR |
| Homologação final e Go/No-Go de lançamento | DIR | PRD | TEC, SEG, PRI, PED, FIN | OPS |

**Regra de aprovação única:** cada decisão institucional tem um único A; especialistas podem vetar publicação insegura/incorreta e solicitar revisão. Mudanças de contratos comerciais continuam com o responsável pelo Portal/serviço comercial competente.

## 4. Alçadas por classe de risco (sem criar valores)

| Classe | Exemplos | Regra proposta |
|---|---|---|
| R0 — Consulta / sem efeito | Ver catálogo, consultar telemetria agregada | Acesso por papel autorizado, auditoria proporcional |
| R1 — Rascunho reversível | Elaborar roteiros, sugerir atualização, gerar imagem rascunho | IA pode preparar e propor; versionamento e revisão conforme etapa |
| R2 — Publicação operacional controlada | Atualizar uma aula aprovada, editar metadata autorizada | Comando tipado, checagem de versão e aprovação por autoridade editorial; rollback |
| R3 — Crítica | Publicar conteúdo de risco, trocar modelo, alterar permissões, acessar dados sensíveis, restaurar produção ou mudar integração com clientes | Aprovação humana competente e revisão independente ou compensatória, com registro e plano de reversão |
| R4 — Financeira/contratual | Criar nova assinatura, ultrapassar orçamento, contratação ou gasto recorrente | Aprovação financeira de quem possui alçada definida e, conforme limiar a ratificar, da direção; **IA não pode comprar** |
| R5 — Legal e privacidade | Compartilhar dados externamente, mudar retenção, atender exclusão ampla, troca de operador/país | Aprovação PRI/SEG e da direção se impacto relevante, conforme avaliação jurídica |

**Limiar monetário de autorização:** **a definir por decisão financeira específica do P0-10**; nenhuma classificação nesta matriz equivale a autorização de reais ou dólares. Em caso de dúvida ou conflito de papéis, bloquear ação crítica, registrar e escalar.

## 5. Fluxo de aprovação e rastreabilidade

1. Pedido identifica **recurso, empresa, pessoa, finalidade, tipo de ação, versão, custo estimado e risco**.
2. Sistema calcula nível de autonomia, identifica papel requerido e verifica ausência de conflito de interesse.
3. Revisores têm acesso **somente ao material estritamente necessário**; dados de alunos/chats privados não entram no expediente por padrão.
4. Autoridade registra aprovação, negativa ou pedido de ajuste, com validade e escopo. Silêncio não é aprovação.
5. Execução recebe **comando tipado de uso único ou idempotente**; o n8n pode orquestrar mas não criar a aprovação.
6. Resultado técnico fica relacionado à decisão e ao resultado oficial da autoridade competente; tratar timeout como inconclusivo.
7. Mudanças críticas geram histórico não alterável por administradores comuns, trilha de revisão e, quando cabível, rollback.
8. Exceção ou emergência exige justificativa, prazo, aprovação e revisão posterior. Segurança pode **suspender preventivamente** recurso suspeito sem tornar-se autoridade comercial.

## 6. Diretrizes de equipe pequena

- Funções podem ser designadas por pessoa acumuladora no início, sem necessidade de contratar uma equipe completa antes de validar o piloto, **mas cada função essencial precisa de responsável nominal e disponibilidade comprovada**.
- Se não houver duas pessoas com competência para revisar ato crítico, usar assessor/revisor externo com escopo restrito ou **não realizar a ação crítica** até obter revisão adequada.
- Não transformar um agente IA em "segunda pessoa" independente para validar atos que exigem aprovação humana.
- Substituição temporária exige delegação específica, escopo e vencimento; a ausência do aprovador não autoriza aprovação por silêncio.
- Vincular contratos de prestadores e funções de suporte a acessos temporários revogáveis, sem concessão de acesso administrativo global.

## 7. Registro nominal a preencher antes do piloto

| Papel | Titular | Substituto | Canal e SLA de contato | Data de designação |
|---|---|---|---|---|
| DIR | **A designar** | A designar | A definir | Pendente |
| PRD | **A designar** | A designar | A definir | Pendente |
| PED | **A designar** | A designar | A definir | Pendente |
| TEC | **A designar** | A designar | A definir | Pendente |
| SEG | **A designar** | A designar | A definir | Pendente |
| PRI | **A designar** | A designar | A definir | Pendente |
| FIN | **A designar** | A designar | A definir | Pendente |
| OPS | **A designar** | A designar | A definir | Pendente |

A designação final poderá usar prestação de serviços ou acúmulo controlado de papéis e deve ser ratificada pela DIR antes de operar dados reais. Esta proposta não presume equipe já contratada.

## 8. Critérios de aceite e verificações futuras

| ID | Evidência necessária |
|---|---|
| HT-UNI-GOV01 | Usuário sem papel definido não aprova publicação crítica |
| HT-UNI-GOV02 | Agente que criou o material não aprova a própria publicação |
| HT-UNI-GOV03 | Ordem sem autorização ou com autorização expirada é rejeitada |
| HT-UNI-GOV04 | Uma ação aprovada gera trilha completa de pedido, decisão e resultado |
| HT-UNI-GOV05 | Falta de autoridade financeira bloqueia assinatura/despesa |
| HT-UNI-GOV06 | Substituição de aprovador exige delegação identificável, prazo e escopo |
| HT-UNI-GOV07 | Administração empresarial não vê chat individual de aluno por padrão |
| HT-UNI-GOV08 | Incidente pode ser escalado/suspenso sem criar direito comercial |
| HT-UNI-GOV09 | Exceção de segurança tem justificativa e revisão posterior |
| HT-UNI-GOV10 | Mudança crítica passa por revisão e permite rollback quando aplicável |
| HT-UNI-GOV11 | Uma pessoa com múltiplos papéis não aprova sozinha ato de alto risco sem controle compensatório |
| HT-UNI-GOV12 | Papéis nominados e suplência adequada foram confirmados antes do piloto |

**Esses testes são futuros, não executados agora.**

## 9. Pedido de aprovação

O P0-11 foi ratificado como **matriz funcional de papéis, responsabilidades, classificação de riscos, alçadas e segregação de funções**, permitindo equipe inicial enxuta com acúmulo controlado. **Nomes e suplentes reais serão definidos antes do piloto**; tetos financeiros dependem da conclusão específica do P0-10.

**Esta ratificação não autoriza programar, contratar ou publicar.** Após P0-11, avançar ao P0-12 — critérios documentais de encerramento, evidências e gate de prontidão, distinguindo planejamento da futura homologação de sistema.
