# Universidade Imagine — Proposta de fechamento das pendências P0 (v0.1)

**Data:** 03/11/2026  
**Estado:** PROPOSTA PARA RATIFICAÇÃO — NÃO É POLÍTICA APROVADA, NÃO AUTORIZA PROGRAMAÇÃO.  
**Origem:** `docs/08-fechamento-candidato/04-DECISOES-P0-PARA-RATIFICAR.md`, `docs/04-pendencias/BLOQUEIOS-P0-matriz-unificada.csv`, base v5 já aprovada funcionalmente.  
**Objetivo:** resolver com decisões expressas os bloqueios reais de planejamento, sem abrir novos módulos e sem confundir documentação com execução de testes.

## Situação anterior preservada

- A **versão-base v5** está aprovada como documento substitutivo prospectivo: 84 capacidades, 14 módulos; os 986 IDs antigos são **históricos**, 320 descrições recuperadas e 666 textos integrais não recuperados.
- Universidade exclusiva para clientes com ao menos um serviço Imagine **contratado, elegível e ativo**, e colaboradores com vínculo autorizado; **não** há venda avulsa nem acesso público.
- Aprendizagem voluntária sem provas, notas ou certificação; Tutor IA é educacional e **não executa operações reais**.
- O Portal é autoridade de contratos, identidade e vínculos. n8n só orquestra; sistemas oficiais preservam os estados de negócio.
- O UNI-001 histórico define **Portal → CRM → Universidade** para ordem de desenvolvimento. Esta proposta **não revoga** a sequência.

## Tabela executiva — 12 grupos

| ID | Recomendação de fechamento | Situação ao publicar esta proposta |
|---|---|---|
| P0-01 Base documental | Ratificar a v5 já aprovada como base canônica prospectiva, sem fingir recuperação literal de 666 textos | **Aprovado funcionalmente**; verificação de integridade editorial pendente |
| P0-02 Sequência | Preservar Portal → CRM → Universidade até decisão expressa do responsável | **Decisão histórica vigente**, alteração não autorizada |
| P0-03 Elegibilidade | Derivar direitos de estados oficiais, um benefício por usuário/vínculo elegível; acesso revogado ao terminar o último serviço | **Regra aprovada**; esquema técnico proposto |
| P0-04 Sessões e revogação | Autorização backend + tokens curtos + invalidação por revisão de direito; tempos sugeridos abaixo | **Parâmetros propostos**, não ratificados |
| P0-05 Privacidade e retenção | Classes separadas, prazos por finalidade e canal de direitos após cancelamento | **Prazos propostos**, validação jurídico-operacional pendente |
| P0-06 Interfaces e eventos | APIs versionadas, eventos idempotentes, conciliação oficial e falha fechada | **Contrato candidato** |
| P0-07 Tutor e agentes IA | Somente fontes aprovadas, sem operações reais, segregação, auditoria e limite de custo | **Política aprovada**, ferramentas/provedores pendentes |
| P0-08 Mídias | Objetos privados, autorização por recurso, credenciais assinadas curtas e revogação | **Solução candidata** |
| P0-09 Infraestrutura | VPS candidata Leaseweb, conteúdo Cloudflare, banco isolado, backup externo, metas candidatas | **Sem provedor/região/cotação homologados** |
| P0-10 Orçamento | Primeira onda de até 12 cursos homologados; separar despesas de infraestrutura, IA, produção e operação | **Sem orçamento integral aprovado** |
| P0-11 Responsabilidades | Definir titular por função e segregação de aprovações; indicar nomes antes de operação piloto | **Responsabilidades candidatas** |
| P0-12 Prontidão | Fechamento documental e homologação de software são marcos diferentes; programação exige aprovação própria | **Diretriz aprovada**; aceite final documental pendente |

## Decisões técnicas propostas para ratificação

### P0-03 — Elegibilidade e estados oficiais

1. O Portal/serviço comercial confirma **contrato, serviço, vigência e elegibilidade**. A Universidade nunca muda o estado comercial.
2. Estado oficialmente **ativo** e serviço elegível permite acesso com identidade, vínculo e permissão válidos. Tolerância financeira só preserva benefício se o contrato continuar oficialmente ativo.
3. Estados suspenso, cancelado efetivamente, expirado, pendente ou somente teste gratuito não geram benefício por si só.
4. Com múltiplos contratos, a revogação de um não encerra o acesso caso outro serviço elegível permaneça ativo.
5. Respostas desconhecidas, sem vínculo ou sem autoridade negam **nova concessão**; sessões pré-existentes só valem enquanto autorizadas e não revogadas.
6. Toda autorização de API, vídeo e Tutor possui `subject_id`, `company_id`, `resource`, revisão e validade.

### P0-04 — Autenticação, sessões e revogação

**Padrão candidato, a confirmar tecnicamente:** integração de identidade por OIDC/OAuth 2.0 homologado, autorização de backend a cada recurso restrito, sessão vinculada à pessoa e à empresa, e mecanismos de invalidação de sessão ao perder o direito.

**Parâmetros candidatos sujeitos à ratificação e ensaios:** token de acesso de API com vida máxima **15 minutos**; credencial de reprodução de vídeo emitida por **até 5 minutos** para iniciar o recurso; invalidação da autorização para **novas emissões imediatamente após confirmação oficial**; janela de propagação máxima desejada **5 minutos**, a validar contra CDN e fornecedor. Se o mecanismo não suportar revogação imediata de credenciais já emitidas, registrar a limitação e não prometer bloqueio instantâneo da reprodução em andamento.

### P0-05 — Privacidade e retenção

**Matriz candidata para avaliação jurídica, NÃO prazo vigente:**

| Classe | Prazo candidato | Marco e condição |
|---|---|---|
| Progresso, favoritos, retomada | **120 dias** após último término de elegibilidade | Recontratação permite reavaliar recuperação; eliminação/anonimização após prazo, ressalvadas obrigações legais |
| Conversas do Tutor IA | **30 dias** após a última interação ou perda de elegibilidade, o que ocorrer primeiro | Prazo reduzido; permitir solicitação de exclusão conforme normas aplicáveis |
| Arquivos temporários de produção | **24 horas** após encerramento da tarefa | Excluir e registrar exceções técnicas justificadas |
| Logs de segurança/auditoria | **180 dias** como referência mínima a avaliar | Ajustar a requisitos legais, incidentes, finalidade e segurança |
| Backups técnicos | **30 dias** de retenção rotativa como referência | Eliminação lógica por ciclo, proteção e testes de restauração |

Documentar finalidade, base legal apropriada, controladoria, transferências internacionais, suboperadores, direitos de exportação/exclusão e resposta pós-cancelamento. Não adotar os prazos sem revisão jurídica/LGPD.

### P0-06 — Contratos e eventos

- Interface síncrona candidata: JSON sobre HTTPS, versão declarada e autenticação de serviço adequada; contrato canônico de decisão `evaluateEducationEntitlement` documentado na base v5.
- Evento assíncrono tipado inclui `event_id`, `source`, `schema_version`, `company_id`, `aggregate_id`, `aggregate_revision`, tempos e `correlation_id`, sem dados pessoais dispensáveis.
- Produtor usa mecanismo transacional equivalente a *outbox*; consumidor registra *inbox* idempotente, impede efeitos duplicados e ignora revisão antiga.
- Falhas e estados inconclusivos são reconciliados contra a fonte oficial. n8n não registra confirmação de contrato em nome da autoridade comercial.
- Políticas numéricas de retentativa/alerta: detalhar no projeto técnico antes de implementação da interface, com testes de concorrência, queda e atraso previstos.

### P0-07 — Tutor IA, governança e segurança

- Tutor consulta somente materiais homologados e fontes autorizadas; não dispõe de credenciais de escrita, APIs operacionais de CRM/Sites/Performance nem execução livre de comandos.
- Chamada ao modelo envia apenas contexto mínimo necessário, separando pessoa, vínculo, empresa e finalidade; conversa pessoal não é exposta automaticamente ao administrador empresarial.
- Ferramentas e modelos escolhidos por catálogo central homologado, controle de custos, logs mínimos, testes de prompt injection e isolamento, revisão humana de publicações críticas.
- Falha do modelo não impede acesso ao catálogo estático de conteúdo autorizado.

### P0-08 — Conteúdos protegidos

- Objetos e vídeos exclusivos são **privados por padrão**; autorização por recurso antes de emitir acesso; credenciais curtas, protegidas e revogáveis nos limites do provedor.
- Documentar controle de cache, links expirados, compartilhamento e revogação; não prometer impedir gravação de tela ou cópia analógica.
- Cloudflare R2/Stream são **candidatos** à prova técnica e comercial, não fornecedores homologados.

### P0-09 — Infraestrutura e recuperação

**Arquitetura candidata:** frontend estático no CDN autorizado; API e dados educacionais em domínio e recursos independentes do CRM; PostgreSQL separado logicamente e protegido; filas/rotinas isoladas; backups criptografados externos e teste de restauração.

**Metas iniciais candidatas, NÃO SLA:** RPO de até **4 horas**, RTO de até **8 horas** para dados educacionais centrais, metas a verificar por simulação e orçamento. Disponibilidade de tutoria por IA pode ter objetivo distinto do acesso aos cursos estáticos. Região de hospedagem permanece por definir mediante custo, latência, segurança, transferência internacional de dados e LGPD.

### P0-10 — Viabilidade e orçamento

- Lançamento com catálogo essencial homologado, **até 12 cursos** candidatos da primeira onda; 60 cursos são meta editorial de médio prazo, não obrigação de pré-lançamento.
- Montar orçamento de **implantação + mensalidade fixa + consumo variável**: aplicação, banco, backups, CDN, vídeo, R2, IA, ferramentas, licenças, equipe, segurança, suporte, produção/revisão, impostos/câmbio.
- Pré-lançamento: orçamento de base com **0, 100, 500 e 1.000 empresas elegíveis** e cenários leve/base/intenso; cotação efetiva para componentes pagos antes de contratar.
- Nenhuma despesa ou assinatura autorizada por esta especificação.

### P0-11 — Matriz de responsabilidades

| Área | Responsável pela decisão | Substituição / segregação |
|---|---|---|
| Visão, escopo e autorização final | Responsável institucional pelo Ecossistema Imagine | Delegação formal |
| Conteúdo pedagógico | Coordenação pedagógica | Revisor autorizado |
| Precisão técnica de tutoriais | Responsável oficial do produto ensinado | Especialista do produto |
| Segurança e arquitetura | Responsável técnico de segurança | Revisor independente quando necessário |
| Privacidade e LGPD | Responsável pela conformidade/encarregado designado quando aplicável | Canal institucional de privacidade |
| Despesas | Autoridade financeira da Imagine | Dupla aprovação para exceções relevantes |
| Publicação editorial crítica | Autoridade editorial humana | Separação do produtor automatizado |

Nomes próprios, alçadas financeiras e suplentes deverão ser definidos antes do piloto operacional; o desenho de função e a política de segregação são suficientes para o planejamento documental se formalmente ratificados.

### P0-12 — Gate de planejamento e de produção

**Gate documental:** base v5 e decisões aprovadas; contratos e políticas documentados; arquitetura candidata validada por responsáveis; estimativa e limites de custos aprovados; critérios de aceite definidos; pendências com dono, prazo e distinção entre impeditivas de programação e verificações posteriores.

**Gate de programação:** após Gate documental, autorização expressa separada, compatível com a ordem histórica de desenvolvimento e disponibilidade das dependências.

**Gate de lançamento:** após implementação, testes de integração, segurança, privacidade, acessibilidade, performance, backups e Go/No-Go aprovados. Não exigir testes de software inexistente para declarar o **planejamento** pronto.

## Questão de precedência que exige decisão expressa

O UNI-001 original determinou: **primeiro concluir Portal, depois CRM, e só então programar Universidade**. Nenhum aceite genérico de planejamento revogou essa sequência. Alternativas para ratificar:

- **A — Preservar a ordem original (padrão vigente):** continuar detalhamento/produção documental da Universidade, mas iniciar implementação apenas após conclusão de Portal e CRM.
- **B — Permitir programação paralela da Universidade em ambiente isolado:** somente após gate documental e autorização específica; integrações e tutoriais ligados a produtos só podem ser lançados quando as versões correspondentes estiverem efetivamente homologadas. **B altera a ordem histórica e exige autorização expressa.**

## Próximas evidências para efetivo fechamento

1. Aprovação ou ajustes expressos dos parâmetros candidatos (especialmente prazos, tokens, RPO/RTO, interfaces e orçamento).
2. Decisão sobre **A/B** na sequência de programação, caso se deseje modificá-la.
3. Quadro de orçamento com cotação verificável e eventual análise LGPD.
4. Registro da aprovação final do pacote e liberação específica do desenvolvimento — não implícita.

**Este arquivo é uma proposta. Publicá-lo no GitHub não o aprova.**
