# Pré-Gate C — Bloco B: responsáveis, esforço, orçamento e limites financeiros da Fundação Segura (C-00)

**Data:** 04/11/2026.
**Estado:** **PROPOSTA DOCUMENTAL PARA REVISÃO; NÃO RATIFICADA COMO ORÇAMENTO, DESPESA OU AUTORIZAÇÃO DE GATE C**.
**Origem:** após aprovação expressa do [Bloco A — Decisão UNI-BA](DECISAO-UNI-PRE-GATE-C-BLOCO-A-APROVADO-2026-11-04.md), iniciar o planejamento do Bloco B, conforme a sequência Bloco A → Bloco B → Bloco C.
**Precedências:** [D15 — encerramento documental Gate D](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md), [P0-10 — método de orçamento](DECISAO-UNI-P0-10-2026-11-04.md), [P0-11 — RACI/alçadas](DECISAO-UNI-P0-11-GOVERNANCA-2026-11-04.md), [C04 — cenário de esforço C-00](PRE-GATE-C-04-ORCAMENTO-TRABALHO-E-CENARIOS-C00-v0.1-2026-11-04.md), [Checklist pré-Gate C](PRE-GATE-C-CHECKLIST-ORCAMENTO-E-AUTORIZACAO-v0.1-2026-11-04.md).
**Limites:** **NÃO executar programação, testes, provisionamento da VPS, instalação de ferramentas, contratação, ativação de R2 ou alteração dos projetos existentes**. Gate C da Universidade permanece bloqueado.

## 1. Base técnica de orçamento já ratificada

A etapa futura **C-00 — Fundação Segura** inclui somente:
- C00-01: repositório e padrões de desenvolvimento;
- C00-02: backend Laravel/PHP e PostgreSQL educacional isolado;
- C00-03: mocks de identidade/vínculo/elegibilidade/eventos UNI-C01 a C04;
- C00-04: interface estática/catálogo fictício;
- C00-05: isolamento, permissões e segurança;
- C00-06: verificações e documentação técnica depois de Gate C.

**Fora do ciclo:** cursos/vídeos reais, Stream e R2 de mídia, Tutor IA real, integrações comerciais, conta de aluno/cliente real, pagamento, banco de produção, lançamento e infraestrutura exclusiva de produção. A futura VPS de desenvolvimento é **compartilhada**, não VPS por projeto.

A escolha **Laravel/PHP + PostgreSQL + Docker Compose e mocks** foi aprovada **somente como direção técnica documental** pelo Bloco A. Versões, custo e execução permanecem abertos.

## 2. Papéis e responsabilidades — designação nominal pendente

| Papel | Responsabilidade para o C-00 | Pré-requisito antes do Gate C |
|---|---|---|
| DIR — Direção | Ratificar escopo, limite de gastos e ato Gate C | Responsável e autoridade de aprovação identificados em documento |
| PRD — Produto | Priorizar C00-01..06 e critérios de aceite, revisar decisões e mudanças | Titular com autoridade editorial/funcional |
| TEC — Engenharia | Responsabilidade técnica por código, migrações, mocks, arquitetura e controle de versões | Executor, substituto e disponibilidade definidos |
| SEG — Segurança | Avaliar isolamento, segredos, autenticação e risco de comprometimento | Revisor humano independente **ou controle compensatório aprovado** |
| FIN — Financeiro | Validar custo econômico, desembolso máximo, câmbio/impostos e alçadas | Titular de aprovações monetárias |
| OPS — Infraestrutura | Proteger o ambiente autorizado, contêineres, backups e acesso | Responsável pelo ambiente, se VPS for autorizada |
| QA — Qualidade/revisão | Critérios de testes, revisão de entregas e evidência | Responsável/revisor humano designado (papel pode ser acumulado com controles) |
| PRI — Privacidade | Confirmar uso apenas de dados sintéticos e ausência de integrações reais | Revisão apropriada a risco do C-00 |
| AGT — Agentes IA | Assistência supervisionada para planejamento, desenvolvimento/revisão futuros | Não aprova próprio trabalho, risco, gastos ou mudanças sensíveis |

- **Não nomear ou inferir pessoas**: titularidade e capacidade precisam de decisão explícita. A mesma pessoa pode acumular papéis de baixa criticidade; atos críticos exigem revisão humana independente ou controle compensatório documentado. Se indisponível, o ato crítico fica bloqueado.
- Uma IA não autoriza, não assina termo de Gate C, não executa compras, não aprova a própria geração de código e não pode ser única fonte de prova de segurança.
- Registrar responsável por repositório, acesso, segredo, orçamento, testes e incidentes antes de ativação do respectivo recurso.

## 3. Esforço preliminar de engenharia — NÃO é prazo nem preço aprovado

| Entrega | Engenharia (horas ilustrativas) | Critério principal |
|---|---:|---|
| C00-01 Repositório, padrões e CI futura | 10–20 | Ambiente sob acesso controlado, sem deploy de produção |
| C00-02 Backend e PostgreSQL segregado | 20–45 | Modelos educacionais, migrações e permissões |
| C00-03 Mocks UNI-C01 a UNI-C04 | 20–45 | Falha fechada, estados/revisões inválidos negados |
| C00-04 Interface estática fictícia | 8–20 | Nenhum dado real ou mídia privada exposta |
| C00-05 Isolamento e segurança | 25–50 | Revisão de segregação e cenários negativos |
| C00-06 Qualidade, testes e documentação | 15–35 | Evidências rastreáveis e rollback em DEV |
| **Subtotal técnico** | **98–215** | **Cenário anterior não vinculante** |
| Revisão humana de segurança adicional | 15–35 | Não presumir que IA substitui revisão |
| Coordenação/revisão documental | 10–25 | Decisões, aceites, controle de versões |
| **Total ilustrativo de referência** | **123–275 horas** | **Não ratificado nem comprometido** |

**Nota:** horas podem ser reduzidas ou ampliadas por reuso, IA, qualidade, complexidade e capacidade real. O orçamento deverá registrar **quem trabalha, quantas horas e a que custo**, ainda que o trabalho seja próprio da Imagine. Horas não são uma estimativa de calendário, início ou data de entrega.

## 4. Duas opções claras para liberar futuramente apenas a programação

| Alternativa | Escopo permitido SE Gate C futuro aprovar | Infraestrutura e custo | Condições de proteção |
|---|---|---|---|
| **B-L — Código local/sandbox isolado sem VPS** | Criar código da Universidade e executar testes locais apenas com dados sintéticos | **Pode não exigir nova assinatura**, conforme equipamentos/software disponíveis; trabalho humano continua com custo econômico | GitHub versionado, sem credenciais produtivas, sem terceiros pagos, limitações do host verificadas, dados descartáveis e restauração local razoável |
| **B-V — Desenvolvimento na VPS central Leaseweb** | Usar stack Compose e PostgreSQL independente na VPS compartilhada | Contratação da VPS + rateio entre projetos + backup R2 + operação humana **a confirmar em cotação/carrinho**, sujeito a autorização específica | VPS contratada e isolada com permissões e política de backup/restauração aprovadas; verificar concorrência das cinco aplicações |
| **B-M — Sequência gradual** | Iniciar local sob Gate C restrito e migrar para VPS **apenas após novo aceite de infraestrutura** | Prioriza desembolso sob controle e evita bloqueio do código por compra ainda pendente | Não migrar dados/secrets, nem converter autorização local em deploy na VPS automaticamente |

**Recomendação de planejamento:** **B-M** como estratégia econômica e de velocidade: liberar futuramente **apenas C00-01..06 em ambiente local com dados fictícios**, se houver executor/host apto, revisão humana e orçamento aprovado. A decisão arquitetural sobre Leaseweb não é desfeita; apenas sua contratação e sua habilitação ficam em gate posterior. **B-M é proposta, não escolha ratificada**.

B-L ou B-M não autorizam compartilhar máquinas pessoais inseguras, dados reais ou segredos corporativos; o ambiente local deverá ter controle de acesso, criptografia e possibilidade de reinstalação. Se a equipe não dispõe de capacidade adequada, B-V passa a depender de liberação financeira da VPS.

## 5. Matriz financeira para orçamento real

| Centro | Fórmula de custo econômico | O que ainda falta |
|---|---|---|
| Engenharia do C-00 | Horas de TEC × custo/hora efetivo, ou valor contratual | Executor/capacidade/tarifa/contrato |
| Segurança e revisão | Horas de SEG/QA/PRI × custos respectivos | Revisor independente, disponibilidade e valor |
| Produto e coordenação | Horas PRD/DIR/OPS × custo/hora | Alocação real |
| Dev local e ferramentas | Software/equipamentos, GitHub/Actions e consumos faturáveis | Elegibilidade e limites reais das contas |
| Leaseweb (se B-V) | Mensalidade total do checkout × período + implantação/tributos/variação cambial | **€ 13,99/mês é preço-base visualizado da VPS 3, não total de compra** |
| Backup R2 EU (se B-V) | GB-mês + operações + cópia protegida + suporte e impostos | Volume efetivo, política, bucket e teto aprovados |
| IA usada em engenharia (opcional) | Operações/modelos × tarifa efetiva + revisão humana | Fornecedor, permissões e limites de custo |
| Reserva de contingência | Valor ou percentual explícito sobre itens ratificados | Alçada e proposta financeira |
| **Desembolso incremental máximo** | Novos pagamentos/serviços em R$ com limites por fornecedor/período | **Teto em R$ ainda NÃO definido** |
| **Custo econômico completo** | Desembolso + horas/equipe + rateios + contingência + impostos | **Ainda NÃO apurado** |

**Não interpretar D11 (R$ 0,00 de novas despesas da fase DOCUMENTAL) como R$ 0,00 de custo autorizado de programação**. Não utilizar tabelas anteriores de cenários e tarifas como cotações ou promessas. Se a direção escolher teto incremental R$ 0 para código local, isso deverá estar **expresso e limitado**, com custo de equipe/revisão e disponibilidade declarados.

## 6. Condições de orçamento e alçada que faltam

Antes de abrir Gate C, o termo deverá explicitar:
1. Qual opção **B-L**, **B-V** ou **B-M** foi escolhida, e qual máquina/ambiente está permitido no ciclo.
2. Horas e entregáveis autorizados, executor e revisor; limites de autonomia de agentes IA e custos de ferramentas.
3. **Orçamento econômico da fase** e **teto de novos desembolsos em R$**, por fornecedor e período, com responsável aprovador e política de mudança.
4. Se serviços pagos não estão permitidos, proibição de ativação automática de CI pago, Workers, R2, n8n, modelos ou VPS mesmo para testes.
5. Despesas recorrentes e câmbio, quando houver; custos de rollback/backup e margens de contingência.
6. Segurança: dados fictícios, sem integrações reais, sem acesso a sistemas produtivos, sem lançamentos ou publicações.
7. Critérios de término de C-00, evidência de execução, revisão e tratamento de falhas, sem abrir Gate H automaticamente.

## 7. Quadro de decisões do Bloco B

| ID | Deliberação | Estado |
|---|---|---|
| UNI-BB01 | Escolher B-L, B-V ou B-M como modalidade de programação futura | **PROPOSTAS, NÃO APROVADAS** |
| UNI-BB02 | Designar responsáveis de produto, TEC, SEG/QA, financeiro e operação | **ABERTO** |
| UNI-BB03 | Validar esforço e capacidade humana (123–275 h de referência) | **HIPÓTESE, A REVISAR** |
| UNI-BB04 | Apurar custo econômico integral e desembolso por fase/provedor | **NÃO APURADO** |
| UNI-BB05 | Estabelecer teto financeiro explícito em R$, período e contingência | **NÃO APROVADO** |
| UNI-BB06 | Definir política e limites de uso de IA e serviços cobrados | **PENDENTE** |
| UNI-BB07 | Definir alçadas, independência de revisão e mudanças de escopo | **PENDENTE** |
| UNI-BB08 | Elaborar termo específico **Bloco C — Gate C** com todos os parâmetros | **NÃO PREPARADO/SEM AUTORIZAÇÃO** |

## 8. Próximo pedido de aprovação

A direção pode **aprovar o Bloco B como método de planejamento**, sem ratificar ainda pessoas, preço, horas ou modalidade; ou escolher explicitamente uma das modalidades B-L/B-V/B-M. Depois será necessário consolidar os dados reais e propor orçamento/teto e Gate C.

**Situação final:** **Bloco A aprovado documentalmente**; **Bloco B proposto e NÃO aprovado**; **Bloco C/abertura de Gate C pendente**. Nenhuma linha desta proposta autoriza programação, instalação, pagamento ou testes.
