# Pré-Gate C — Checklist para proposta de orçamento e autorização de desenvolvimento

**Data:** 04/11/2026  
**Status:** **ROTEIRO DE PREPARAÇÃO, NÃO APROVADO COMO AUTORIZAÇÃO DE PROGRAMAÇÃO**.  
**Base:** [D15 — encerramento documental](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md). O **Gate D está encerrado quanto à documentação**; o **Gate C não foi autorizado**.

> **Atualização documental de 04/11/2026:** o [Bloco A — arquitetura e ambiente C-00](PRE-GATE-C-BLOCO-A-ARQUITETURA-E-AMBIENTE-C00-v0.1-2026-11-04.md) foi **APROVADO COMO BASE TÉCNICA DOCUMENTAL** em [DEC-UNI-BA](DECISAO-UNI-PRE-GATE-C-BLOCO-A-APROVADO-2026-11-04.md), incorporando a direção mais recente de VPS Leaseweb **compartilhada exclusivamente para DEV**, Laravel/PHP candidato, PostgreSQL educacional isolado, mocks e Docker Compose. Isso **não comprova capacidade do servidor** nem altera C02/C03/C04/C05/C06/C08/C09/C10 enquanto não houver ratificação, orçamento e autorização. Não houve programação, testes ou contratação.

> **Bloco B elaborado para revisão (04/11/2026):** [responsáveis, esforço e opções B-L/B-V/B-M, custo econômico e teto](PRE-GATE-C-BLOCO-B-RESPONSAVEIS-ORCAMENTO-E-TETO-C00-v0.1-2026-11-04.md). **APROVADO COMO MÉTODO DOCUMENTAL** em [DEC-UNI-BB](DECISAO-UNI-PRE-GATE-C-BLOCO-B-BASE-APROVADA-BM-2026-11-04.md), com **B-M preferencial**, mas sem pessoas designadas, custo real ou teto financeiro definido. **C02/C05/C06/C07 seguem abertos**. [Bloco C — minuta Gate C](PRE-GATE-C-BLOCO-C-MINUTA-AUTORIZACAO-C00-v0.1-2026-11-04.md) foi apenas preparado, **Gate C não autorizado**.

## 1. Informações e decisões que deverão ser submetidas separadamente

| ID | Evidência necessária para pedir autorização Gate C | Estado |
|---|---|---|
| C01 | Descrever o escopo preciso da primeira fase de programação e suas exclusões | **APROVADO COMO ESCOPO INICIAL DE PLANEJAMENTO**: [decisão C-00](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md) e [especificação](PRE-GATE-C-01-ESCOPO-FUNDACAO-SEGURA-v0.1-PROPOSTA.md). Gate C não autorizado |
| C02 | Nomear responsáveis pela programação, revisão, segurança, documentação e aprovação, incluindo segregação de funções críticas | **A designar** |
| C03 | Documentar quais contas, repositórios e serviços já existem, sua titularidade e o impacto sobre Portal/CRM | **INSPEÇÃO DE REPOSITÓRIOS REALIZADA; SERVIDORES NÃO AUDITADOS**: [avaliação documental de infraestrutura](PRE-GATE-C-03-AVALIACAO-INFRAESTRUTURA-C00-v0.1-2026-11-04.md). Titularidade, recursos e uso ao vivo ainda a verificar |
| C04 | Definir ambientes de desenvolvimento isolados, dados fictícios e regras de segredos; proibir modificações em produção sem autorização | **A especificar** |
| C05 | Preparar **orçamento integral da fase de desenvolvimento**: horas/equipe, VPS e ambiente de testes, ferramentas, IA, armazenamento, backups, segurança, suporte e contingência | **COMPOSIÇÃO PRELIMINAR DOCUMENTADA**: [modelo C02](PRE-GATE-C-02-ORCAMENTO-FUNDACAO-v0.1-PROPOSTA.md) e [cenários C04](PRE-GATE-C-04-ORCAMENTO-TRABALHO-E-CENARIOS-C00-v0.1-2026-11-04.md). Horas ilustrativas, valores e teto não aprovados |
| C06 | Determinar **teto monetário explícito** da fase, limites de consumo por fornecedor, moeda/impostos/câmbio, responsáveis e gatilhos de aprovação | **R$ 0,00 de novas despesas de fornecedores para a primeira fase LOCAL C-00 APROVADO** por [DEC-UNI-C00](DECISAO-UNI-C00-TETO-ZERO-E-REVISAO-2026-11-04.md); vigência, responsáveis e custo econômico seguem abertos |
| C07 | Identificar atividades possíveis **sem novas contratações** e distinguir custo incremental zero de custo interno alocado | **CENÁRIOS A0/A1/B/C DOCUMENTADOS** em [C04](PRE-GATE-C-04-ORCAMENTO-TRABALHO-E-CENARIOS-C00-v0.1-2026-11-04.md); custo incremental zero é apenas hipótese condicionada a auditoria |
| C08 | Planejar integrações com Portal/CRM por contratos tipados e **mocks** até serviços oficiais homologados, mantendo a opção B de desenvolvimento paralelo | **Política-base aprovada; plano técnico a fazer** |
| C09 | Estabelecer entregáveis do primeiro ciclo, critérios de revisão, evidência de testes, limites de autonomia de IA e política de proteção de dados | **A especificar** |
| C10 | Preparar texto de **autorização Gate C em ato separado**, com escopo, orçamento/teto e responsáveis, sujeito a aceite expresso posterior | **NÃO AUTORIZADO** |

## 2. Estratégia de economia sem sacrificar segurança

- Aproveitar infraestrutura de **desenvolvimento já existente**, somente após avaliação de capacidade, isolamento e ausência de impacto sobre ambientes críticos.
- Não provisionar VPS nova da Universidade só para continuar planejando; **nenhum custo novo** foi autorizado pela decisão financeira D11.
- Para execução após Gate C, avaliar primeiro ambiente de dados fictícios e APIs simuladas. **Nenhuma ligação comercial real ou acesso a dados de clientes** sem homologação e controle oficial.
- Cloudflare Workers/Stream/R2 e VPS própria são candidatas técnicas, não fornecedores contratados ou custos aprovados.
- Não supor que automação/n8n compartilhem ilimitadamente segredos, recursos ou limites entre projetos Imagine.
- Reservar custos indispensáveis de segurança e recuperação e não considerar um subtotal de fornecedor como custo operacional total.

## 3. Fronteiras de autorização

O encerramento do Gate D **não** libera qualquer ação de implementação. Preparar documentos e comparar opções comerciais **não autoriza** assinatura de contrato, cartão, cobrança, servidor novo, criação de deploy, publicação de sites ou processamento real.

**Ponto de partida recomendável para a próxima conversa:** escolher a **primeira fase de desenvolvimento** que se deseja orçar e dimensionar com uso de recursos existentes; em seguida aprovar orçamento/teto e, apenas por nova decisão expressa, abrir Gate C.

**Situação vigente:** Gate D **ENCERRADO DOCUMENTALMENTE**; Gate C **NÃO AUTORIZADO**; Gate H **NÃO INICIADO**; Gate L **NÃO AUTORIZADO**.
