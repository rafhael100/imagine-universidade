# Pré-Gate C / C04 — Composição preliminar do orçamento da Fundação Segura C-00

**Data:** 04/11/2026  
**Status:** **ESTIMATIVAS TÉCNICAS HIPOTÉTICAS, NÃO COTAÇÃO, NÃO TETO FINANCEIRO E NÃO AUTORIZAÇÃO DE DESENVOLVIMENTO.**  
**Escopo de planejamento aprovado:** [C-00](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md).  
**Pré-requisito de viabilidade:** [auditoria de infraestrutura C03](PRE-GATE-C-03-AVALIACAO-INFRAESTRUTURA-C00-v0.1-2026-11-04.md).  
**Metodologia aprovada:** [P0-10](DECISAO-UNI-P0-10-2026-11-04.md).  
**Regra financeira vigente do planejamento encerrado:** [D11](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md): R$ 0,00 em **novas despesas da fase documental**; nada autoriza despesas de desenvolvimento.

> **Decisão de infraestrutura posterior (04/11/2026):** a direção escolheu **em princípio uma nova VPS Leaseweb compartilhada entre os ambientes de desenvolvimento Imagine** ([INF-DEV-01](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/INF-DEV-01-VPS-CENTRAL-LEASEWEB-2026-11-04.md)). O plano VPS 3 de 8 vCPU/24 GB/300 GB NVMe é **recomendado, não aprovado ou contratado**. As linhas de custo A0/A1 de reutilização ficam registradas como comparativos anteriores, não como estratégia escolhida. Após confirmar o checkout, atualizar o orçamento da VPS central com **rateio entre projetos** e seu custo incremental real. **Gate C ainda não autorizado.**

## 1. Estimativa de esforço não vinculante

Para tornar o futuro orçamento calculável, estimar um **intervalo inicial puramente técnico** para seis entregáveis de C-00. **Não é medição de produtividade, proposta de fornecedor, prazo ou preço fechado**. Deverá ser revisado após escolher stack, ambiente, equipe, escopo exato e eventual uso assistido de IA.

| Frente | Horas de engenharia propostas para simulação, não aprovadas | Variáveis que afetam o esforço |
|---|---:|---|
| C00-01 — Base do repositório, convenções e pipeline de testes | 10–20 h | Tecnologias atuais, pipeline e revisão |
| C00-02 — Backend educacional e PostgreSQL independente | 20–45 h | Modelagem, migrações, roles e segmentação |
| C00-03 — Adaptadores e mocks de identidade, contrato e eventos | 20–45 h | Definição de interfaces, estados e cenários negativos |
| C00-04 — Shell de interface e catálogo fictício | 8–20 h | Padrões e acessibilidade |
| C00-05 — Segurança, isolamento e auditoria | 25–50 h | Threat modeling, testes de isolamento e revisão |
| C00-06 — Integração das suítes de teste, documentação e revisão de qualidade | 15–35 h | Cobertura funcional, ambiente e critérios de aceite |
| **Subtotal técnico ilustrativo** | **98–215 h** | Sem considerar revisões independentes e contingência |

**Custos humanos fora do subtotal técnico:** revisão de segurança por pessoa independente, gestão de produto, revisão arquitetural e coordenação financeira devem receber horas e valores próprios. Uma pessoa pode acumular funções, **não aprovar sozinha riscos críticos** sem controle compensatório.

**Sugestão para dimensionamento inicial (a revisar):** acrescentar **15–35 h** de revisão especializada de segurança e **10–25 h** de coordenação/documentação, produzindo **123–275 h de referência econômica total** para orçamento. Intervalos não representam um compromisso de entrega; podem variar com reuso e aprendizado.

**Horas de IA não substituem** a revisão humana de saída, proteção de dados e comprovante de qualidade. Assumir que IA faz tudo gratuitamente subestimaria custos de verificação.

## 2. Fórmulas financeiras para preencher com valores reais

- **Custo de engenharia:** soma de `horas_por_entregável × custo/hora_efetivo_do_executor`.
- **Custo de revisão independente e produto:** `horas × custo/hora` de cada papel, evitando contar a mesma hora duas vezes quando funções forem acumuladas.
- **Custo de infraestrutura existente:** `rateio_aprovado` conforme uso CPU/RAM/disco, manutenção e eventual custo de oportunidade; não necessariamente gera desembolso novo.
- **Novos fornecedores:** `contrato_confirmado + consumo_variável + impostos + câmbio + outros encargos`, sempre antes de contratação.
- **Orçamento econômico completo:** `horas + rateio infraestrutura existente + novos provedores + segurança + contingência`.
- **Teto de desembolso incremental:** valor **explícito em R$**, por período e fornecedor/classe de consumo, a ser aprovado antes do Gate C.

## 3. Cenários de desembolso para comparação (sem afirmar disponibilidade)

| Cenário | Infraestrutura C-00 | Novas despesas de fornecedor durante o futuro desenvolvimento | Trabalho e risco | Situação |
|---|---|---|---|---|
| **A0 — Reusar dev sem aumento de cobrança** | VPS/ambiente de desenvolvimento já contratado e validado | **Poderia ser R$ 0** de **novas cobranças**, somente se contratos, limites e consumo realmente confirmarem | Horas e rateio interno continuam; revisão técnica e segurança obrigatórias | **A verificar, preferência provisória** |
| A1 — Reusar com ampliação de capacidade ou licença | Mesmo ambiente, mas recursos insuficientes | **A cotar e aprovar**, variável por conta/plano | Pode impactar outros projetos, exige quotas | Não aprovado |
| B — VPS dev segregada | Nova VPS da Universidade, isolada | **A cotar e aprovar**, mensalidade e backup/admin | Aumenta custo fixo mas protege outros projetos | Não aprovado |
| C — Sandbox gerenciado temporário | Instância/cloud temporária, sem dados reais | **A cotar e aprovar**, por consumo, limites e operação | Risco de cobrança variável e vendor lock-in | Não aprovado |

**Importante:** o registro de **R$ 0 de despesas autorizadas para a documentação** não fixa automaticamente um limite de **R$ 0 para o desenvolvimento**. Isso exigirá nova decisão financeira e autorização separada de Gate C.

## 4. Despesas que C-00 NÃO precisa assumir antecipadamente

- Stream minutos de vídeo, armazenamento de vídeos de cursos e legendagem; não haverá vídeo real.
- R2 de materiais de clientes ou arquivos de produção; serão usados objetos/dados fictícios locais.
- Tutor IA operacional e conta de créditos dedicada; fora do escopo inicial.
- VPS de produção da Universidade e alta disponibilidade produtiva; custo futuro após Gate C e antes do piloto.
- Produção editorial de 12 cursos e catálogo de 60 cursos; fase posterior com orçamento próprio.
- Integrações reais com cobrança, dados pessoais ou infraestrutura de clientes.

**Custos que NÃO podem ser eliminados artificialmente:** isolamento, controles de autenticação, gestão de segredos, testes, revisão de segurança, proteção do ambiente de desenvolvimento e trabalho humano. Mesmo serviços gratuitos podem ter limites, indisponibilidade e risco operacional.

## 5. Ficha de custo a preencher antes de liberar Gate C

| Dado | Situação |
|---|---|
| Responsável pela aprovação financeira / orçamento total | A indicar |
| Horas reais por entregável | A validar |
| Custo/hora efetivo e encargos de cada função | A informar |
| Carga de segurança e revisão independente | A validar |
| Contrato e uso incremental da VPS dev existente | **Não verificado** |
| Custos de GitHub Actions, Cloudflare e IA no uso projetado | **Não verificados** |
| Cotação de VPS dedicada/sandbox se não puder reusar dev | Condicional |
| Contingência proposta em reais | A calcular |
| **Orçamento econômico total da fase** | **Não apurado** |
| **Teto máximo de desembolso incremental em reais** | **Não aprovado** |
| Validade, responsável e gatilhos de alteração | A definir |
| **Autorização específica do Gate C** | **NÃO CONCEDIDA** |

## 6. Estratégia a submeter posteriormente

1. Primeiro validar infraestrutura/segurança/capacidade; se **A0** for comprovadamente viável, propor **teto incremental explícito e restritivo**, podendo inclusive ser R$ 0 para novas compras, com rateio do custo real já existente e horas humanas descritas.
2. Caso A0 falhe, comparar B/C por **custo total** (VPS, backup, suporte, segurança, impostos, tempo de operação), não só pelo preço anunciado.
3. Antes de autorizar Gate C, ratificar **duas coisas diferentes**: o **escopo C-00 e seu orçamento/teto**, e o **ato expresso de autorização de programação**. Nenhuma autorização por silêncio.
4. Medir e reconciliar gastos efetivos durante o desenvolvimento apenas depois da autorização, com alerta antes de ultrapassar limites.

**Este documento apenas completa a pré-análise financeira. Gate D encerrado documentalmente; Gate C não autorizado; nenhuma compra, provisionamento, programação ou execução de testes de software realizada.**
