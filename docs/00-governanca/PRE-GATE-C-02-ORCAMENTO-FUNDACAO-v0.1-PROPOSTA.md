# Pré-Gate C / C02 — Modelo de orçamento e teto da Fundação Segura C-00

**Data:** 04/11/2026  
**Estado:** **PROPOSTA FINANCEIRA DE REFERÊNCIA — NÃO É ORÇAMENTO APROVADO E NÃO AUTORIZA GASTOS OU PROGRAMAÇÃO.**  
**Escopo base:** [C01 — primeira etapa candidata C-00](PRE-GATE-C-01-ESCOPO-FUNDACAO-SEGURA-v0.1-PROPOSTA.md); [D15 — Gate D encerrado documentalmente](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md).  
**Regra econômica anterior:** [D11 alternativa A](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md) fixou **R$ 0,00 de novas despesas autorizadas na fase documental**; não é orçamento ou teto de desenvolvimento.

## 1. Duas dimensões financeiras — não confundir

- **Desembolso incremental:** o que efetivamente passará a ser cobrado a mais por provedores, profissionais, serviços ou licenças em consequência da fase C-00.
- **Custo total econômico:** desembolso incremental **mais** horas de trabalho próprio/equipe alocadas, rateio da infraestrutura já contratada, revisão, segurança, manutenção e contingência. O fato de não haver fatura nova **não significa custo econômico total zero**.

**Esta proposta ainda não pode afirmar nem aprovar um teto monetário real**, porque faltam inventário de recursos, condições de cobrança, horas da equipe e sua precificação.

## 2. Cenários financeiros sem compras antecipadas

| Alternativa a avaliar | Requisito | Desembolso incremental possível | Risco / condição |
|---|---|---|---|
| **A — Reutilização segura do ambiente de desenvolvimento Imagine (preferencial)** | Capacidade ociosa **verificada**, containers/projetos isolados, banco independente, segredos segregados, sem dados reais, backup de testes conforme risco | **Pode ser R$ 0 de novos fornecedores**, **somente se** o uso realmente não acionar cobranças extras nem gerar custos adicionais de pessoas/serviços | Provar que não afeta n8n central, CRM, Portal nem outras atividades; sem criar acesso compartilhado a dados de produção |
| B — Ambiente de desenvolvimento próprio e isolado | Necessidade técnica comprovada ou isolamento insuficiente em A | Valor mensal e implantação **a cotar** | Novo servidor/serviço pode ser necessário; compra somente após orçamento/teto e autorização |
| C — Hospedagem/ambiente gerenciado de desenvolvimento | Preferência por menos manutenção e recursos gerenciados | Valor por operação, usuário, armazenamento e consumo **a cotar** | Pode criar despesa variável imprevisível sem caps e alertas |

**Recomendação:** estudar A primeiro, mantendo B ou C como alternativas se a avaliação de segurança, desempenho ou continuidade reprovar a reutilização. **Não dispensar** controles de segurança, segregação ou backup para alcançar zero desembolso.

## 3. Planilha lógica de composição do orçamento

| Centro de custo | Unidade | Quantidade a validar | Valor a cotar/calcular | Responsável funcional |
|---|---|---|---|---|
| Engenharia backend/API + PostgreSQL | horas humanas | **Pendente** | horas × custo/hora efetivo | TEC / FIN |
| Frontend/testes de interface | horas humanas | **Pendente** | horas × custo/hora efetivo | TEC / FIN |
| Infraestrutura, pipeline, monitoramento e backup | horas + cobrança de serviços | **Pendente** | horas + provedor real | TEC / FIN |
| Segurança, revisão técnica e QA | horas humanas + ferramentas | **Pendente** | horas × custo/hora + licenças | SEG / FIN |
| Produto, documentação e critérios de aceite | horas humanas | **Pendente** | horas × custo/hora | PRD / FIN |
| Infraestrutura já contratada (rateio, se usada) | mês + parcela de CPU/RAM/storage | **Pendente** | rateio baseado em consumo observável | TEC / FIN |
| Novas assinaturas/ambientes/serviços | unidade/mês | **Zero até autorização; futura necessidade a validar** | cotação formal | FIN / DIR |
| IA/agentes usados no desenvolvimento | chamadas/tokens e tempo de revisão | **Pendente** | tarifa efetiva + consumo medido + revisão | TEC / FIN |
| Contingência financeira | % ou valor nominal | **Pendente de decisão** | sobre subtotal aprovado | FIN / DIR |
| Encargos, câmbio, tributos e suporte | conforme fornecedor | **Pendente** | orçamento tributário e contratual real | FIN / PRI |

`Custo econômico da fase = Σ(horas de cada papel × custo/hora correspondente) + Σ(novos serviços/consumos) + rateio de recursos existentes + contingência + tributos/encargos aplicáveis`.

`Teto de desembolso incremental = limite monetário em R$ expressamente autorizado, com período e responsabilidade`. Quando houver contratos em moedas estrangeiras, incluir proteção contra variação cambial e confirmação de impostos.

## 4. Política de limites proposta, ainda não ratificada

1. **Nenhum limite monetário está definido nesta proposta.** Um eventual C-00 com **R$ 0 de novas despesas de fornecedores** só poderá ocorrer se a direção expressamente ratificar essa condição e comprovar a capacidade do ambiente existente, o custo de trabalho e a ausência de cobranças extras.
2. A primeira autorização C poderá proibir novos fornecedores e serviços cobrados, **sem dispensar a aprovação do orçamento total da equipe e do teto aplicável**. Nova necessidade cria solicitação de mudança financeira.
3. Se for inevitável um serviço pago, identificar fornecedor, plano, recorrência, uso variável, forma de pagamento, cancelamento e limite total antes de autorizar.
4. Usar alertas de consumo e proteção contra excedentes de IA/infraestrutura. Se gastos atingirem limite, suspender novas operações pagas não essenciais e pedir nova aprovação; evitar exposição de dados.
5. Seguir P0-11: uma decisão técnica não substitui autorização financeira, e agentes IA não podem contratar serviços, alterar planos ou aprovar despesas.

## 5. Evidências que faltam para um valor final

- **Inventário** do ambiente de desenvolvimento e de suas quotas reais (CPU, RAM, disco, rede, créditos e licenças) e impacto sobre projetos Imagine ativos.
- **Horário/participação** dos responsáveis humanos e custo de suas horas, mesmo quando se trata de trabalho do próprio negócio.
- **Cotação** de qualquer novo ambiente, ferramenta ou provedor que se revele indispensável para atender segurança e qualidade.
- **Valor em reais** aprovado para custo total da fase, teto do desembolso, período de validade, autorização de exceções e responsável.
- **Escopo definitivo** C-00 com exclusões e critérios; confirmar competências de revisores técnicos/segurança.

## 6. Conclusão recomendada

**Recomenda-se a estratégia A de apuração financeira:** utilizar recursos existentes **somente se** houver prova de capacidade e isolamento e se não houver cobrança incremental; estimar as horas humanas e o custo total antes de submeter **um orçamento e teto concretos**.

A alternativa de ambiente novo continua disponível se necessária para proteger a qualidade, privacidade ou desempenho dos demais sistemas.

**Não são aprovados neste documento valores, teto, compras, licenças ou autorização de programação.** O Gate D está documentalmente encerrado. O Gate C permanece **NÃO AUTORIZADO**.
