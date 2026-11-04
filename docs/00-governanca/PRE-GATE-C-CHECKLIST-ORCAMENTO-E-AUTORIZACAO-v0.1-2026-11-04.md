# Pré-Gate C — Checklist para proposta de orçamento e autorização de desenvolvimento

**Data:** 04/11/2026  
**Status:** **ROTEIRO DE PREPARAÇÃO, NÃO APROVADO COMO AUTORIZAÇÃO DE PROGRAMAÇÃO**.  
**Base:** [D15 — encerramento documental](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md). O **Gate D está encerrado quanto à documentação**; o **Gate C não foi autorizado**.

## 1. Informações e decisões que deverão ser submetidas separadamente

| ID | Evidência necessária para pedir autorização Gate C | Estado |
|---|---|---|
| C01 | Descrever o escopo preciso da primeira fase de programação e suas exclusões | **PROPOSTA PARA RATIFICAÇÃO**: [Fundação Segura C-00](PRE-GATE-C-01-ESCOPO-FUNDACAO-SEGURA-v0.1-PROPOSTA.md). Sem programação autorizada |
| C02 | Nomear responsáveis pela programação, revisão, segurança, documentação e aprovação, incluindo segregação de funções críticas | **A designar** |
| C03 | Documentar quais contas, repositórios e serviços já existem, sua titularidade e o impacto sobre Portal/CRM | **A verificar** |
| C04 | Definir ambientes de desenvolvimento isolados, dados fictícios e regras de segredos; proibir modificações em produção sem autorização | **A especificar** |
| C05 | Preparar **orçamento integral da fase de desenvolvimento**: horas/equipe, VPS e ambiente de testes, ferramentas, IA, armazenamento, backups, segurança, suporte e contingência | **MODELO PROPOSTO**: [C02 Orçamento C-00](PRE-GATE-C-02-ORCAMENTO-FUNDACAO-v0.1-PROPOSTA.md). Valores, totais e cotações pendentes |
| C06 | Determinar **teto monetário explícito** da fase, limites de consumo por fornecedor, moeda/impostos/câmbio, responsáveis e gatilhos de aprovação | **Pendente** |
| C07 | Identificar atividades possíveis **sem novas contratações** e distinguir custo incremental zero de custo interno alocado | **CENÁRIOS PROPOSTOS**: reutilização segura sujeita a inventário, capacidade e autorização. Não houve validação real |
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
