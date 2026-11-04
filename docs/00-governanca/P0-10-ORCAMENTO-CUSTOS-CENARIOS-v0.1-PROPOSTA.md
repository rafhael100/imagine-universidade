# P0-10 — Orçamento, preços públicos e cenários de escala

**Data de referência:** 04/11/2026.  
**Status:** **PROPOSTA PARA RATIFICAÇÃO**, não aprovada e sem autorização de despesas, fornecedores ou programação.  
**Escopo:** Universidade Imagine; benefício gratuito para clientes com serviço Imagine elegível ativo, não vendido separadamente.  
**Objetivo:** viabilizar qualidade e segurança com baixo investimento inicial, incluindo custos humanos e operacionais que uma calculadora de VPS isolada não cobre.  
**Precedências:** P0-03 a P0-09 aprovados como bases funcionais/técnicas; Stream, R2, Workers e Leaseweb ainda dependem de orçamento, contratos e homologação; P0-11/P0-12 permanecem pendentes.

## 1. Preços públicos verificados — não são cotações negociadas

| Item | Referência em 04/11/2026 | Fonte | Cuidado de orçamento |
|---|---|---|---|
| Workers Static Assets | Requisições **estritamente estáticas** gratuitas e ilimitadas; storage de assets sem cobrança adicional | https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ | Gateway/API autenticada e invocações do Worker têm consumo e regras diferentes |
| Workers Paid | **US$ 5/mês por conta**, com 10 milhões de invocações e 30 milhões de CPU-ms incluídos; excedentes conforme tabela | https://developers.cloudflare.com/workers/platform/pricing/ | Não cobrar US$ 5 por aplicação se a mesma conta já assina Paid; fazer rateio |
| Cloudflare Stream — vídeos armazenados | **US$ 5/mês por bloco de 1.000 minutos** de capacidade; pré-pago | https://developers.cloudflare.com/stream/pricing/ | Não é armazenamento gratuito; 12 cursos curtos cabem no primeiro bloco |
| Cloudflare Stream — vídeo entregue | **US$ 1 por 1.000 minutos entregues**; consumo pós-pago | https://developers.cloudflare.com/stream/pricing/ | Pré-carregamento e segmentos entregues podem ser faturados mesmo sem visualização integral |
| Cloudflare R2 Standard | 10 GB-mês, 1 milhão operações A e 10 milhões B mensais no Free; excedentes **US$ 0,015/GB-mês, US$ 4,50/milhão A, US$ 0,36/milhão B** | https://developers.cloudflare.com/r2/pricing/ | Gratuidade é por conta/classe conforme tabela; backups e materiais competem pela franquia; egress sem cobrança no R2 |
| Cloudflare WAF/DNS — Free | **US$ 0/mês** por zona, com recursos disponíveis no Free | https://www.cloudflare.com/plans/ | Implementar medidas realmente necessárias e validar configurações |
| Cloudflare WAF/DNS — Pro | **US$ 25/mês faturado mensalmente por zona** ou US$ 20/mês com cobrança anual | https://www.cloudflare.com/plans/ | Opcional: habilitar quando proteção específica justificar, não contratar indiscriminadamente |
| Leaseweb VPS 1, Europa | **aprox. € 4,99/mês** sem fidelidade, 4 vCPU/6 GB RAM/100 GB NVMe; preço anual divulgado por comparadores em aprox. € 4,49/mês | https://hostcritiq.net/providers/leaseweb/plans/vps-1 ; https://www.leaseweb.com/en/products-services/cloud/virtual-private-server | Preço de comparadores de out/2026; **não confirmado em checkout/contrato**; sem impostos, backup externo, administração e extras |
| Leaseweb VPS 2, Europa | **aprox. € 8–9/mês** em fontes comparativas, 6 vCPU/16 GB RAM/200 GB NVMe | https://hostingcompass.com/en/providers/leaseweb/vps | Confirmar região, garantia, CPU compartilhada e contrato antes de comparar |
| Leaseweb Public Cloud | **Produto diferente de VPS barata**; preços variam por instância, plataforma, armazenamento, região e rede | https://www.leaseweb.com/en/products-services/cloud/public-cloud/pricing | Não substituir preços de VPS por preços de Public Cloud nem afirmar equivalência de SLA |

**Escopo destas tarifas:** dados de páginas oficiais Cloudflare e referências publicadas por terceiros para VPS Leaseweb. Não foram verificados preços de checkout da conta Imagine, contratos com fornecedores, moeda final, região de tratamento, IOF/impostos/câmbio ou complementos. Não converter este quadro em cotação comercial.

## 2. Premissas de consumo — simuladas, NÃO dados reais de clientes

Para medir **entrega mensal de vídeo**, considerar três hipóteses de uso por **empresa elegível**:

| Intensidade | Alunos ativos mensais por empresa | Minutos de vídeo entregues por aluno/mês | Total de minutos por empresa/mês |
|---|---:|---:|---:|
| Leve | 1 | 30 | 30 |
| Base | 2 | 60 | 120 |
| Alta | 4 | 120 | 480 |

Fórmula: `minutos entregues = empresas elegíveis × alunos ativos por empresa × minutos entregues por aluno`.  
Custo estimado Stream somente da **entrega**: `minutos entregues / 1000 × US$ 1`. Não inclui storage, pré-carregamento adicional, IA ou outros itens. O faturamento real depende dos minutos de segmentos efetivamente entregues.

### Cenários de custo de entrega Stream — por mês

| Empresas elegíveis | Leve: minutos / US$ | Base: minutos / US$ | Alta: minutos / US$ |
|---|---:|---:|---:|
| **0** | 0 / **0** | 0 / **0** | 0 / **0** |
| **100** | 3.000 / **3** | 12.000 / **12** | 48.000 / **48** |
| **500** | 15.000 / **15** | 60.000 / **60** | 240.000 / **240** |
| **1.000** | 30.000 / **30** | 120.000 / **120** | 480.000 / **480** |

**Leitura:** número de empresas não determina sozinho custo. Uma empresa com 0 estudantes ativos não gera entrega; outra com dezenas de estudantes pode concentrar uso elevado. Monitorar minutos por pessoa, curso e empresa e usar alertas de anomalia/limites de consumo sem negar acesso lícito arbitrariamente.

## 3. Catálogo editorial e armazenamento de vídeo

Premissa ilustrativa: 20 minutos de vídeo por curso, **não duração oficial de curso**.

| Catálogo efetivamente publicado | Minutos armazenados | Pacotes de Stream (1.000 min) | Valor mensal de capacidade |
|---|---:|---:|---:|
| 0 curso | 0 | 0 | US$ 0 |
| **12 cursos** (primeira onda candidata) | 240 | 1 | **US$ 5** |
| **36 cursos** | 720 | 1 | **US$ 5** |
| **60 cursos** (meta editorial, não compromisso de lançamento) | 1.200 | 2 | **US$ 10** |

Edições duplicadas, versões de vídeo mantidas, mais aulas por curso e gravações de longa duração ampliam minutos armazenados. Validar classificação do conteúdo, custo de legenda, revisão e produção audiovisual **fora** do valor de storage Stream.

## 4. Custos de lançamento — modelo por fase

| Fase | Componentes de produção ativados | Custos conhecidos do catálogo | Custos ainda a orçar |
|---|---|---|---|
| Planejamento, antes de autorizar programação | **Nenhuma nova VPS, Stream ou assinatura por causa da Universidade** | **US$ 0 e € 0 incrementais** se não houver novas compras/uso faturável | Tempo humano de planejamento, serviços compartilhados já contratados; rateio se desejado |
| Desenvolvimento **após autorização específica** | Ambiente isolado, dados fictícios, deploy de testes conforme necessidade | Static assets podem ser gratuitos; demais recursos conforme conta | VPS/ambiente de testes, banco, monitoramento, licenças, engenharia e ferramentas |
| Piloto real controlado | VPS exclusiva, backup externo, conteúdo privado, vídeo/IA por uso, monitoramento | **VPS 1 ~€ 4,99 + Workers US$ 0–5 incremento + Stream storage US$ 5 por 240 min + entrega baseada no uso** | Backup independente, operação/segurança, IA, revisão e produção de cursos, tributos/câmbio |
| Expansão | Maior volume, possível upgrade de VPS e conteúdos | Stream entrega conforme cenários acima, R2 Standard conforme GB e operações | Escalabilidade do banco, SLO, redundância, pessoal, suporte, fornecedor/modelo IA |

A referência **VPS 1 4vCPU/6GB** difere da hipótese **2vCPU/4GB** citada no P0-09, mas pode substituí-la como candidato **se preço e desempenho forem confirmados**. Não contratar automaticamente a VPS 2 só porque é barata; isolamento e backup continuam necessários.

### Piloto ilustrativo — 100 empresas, cenário base

- VPS Leaseweb candidata: **~€ 4,99/mês**, antes de adicionais e impostos.
- Workers Paid: **US$ 0 de acréscimo se a conta Imagine já tiver assinatura Paid com franquia suficiente**; caso precise ativar, cerca de **US$ 5/mês por conta**.
- Stream armazenamento: **US$ 5/mês**, supondo 12 cursos de 20 minutos e nenhuma outra mídia.
- Stream entrega: **US$ 12/mês** no cenário base de 12.000 minutos realmente entregues.
- R2 Standard: até 10 GB-mês e operações incluídas podem ter acréscimo **US$ 0**, se a franquia da conta não estiver comprometida por outros projetos.
- Monitoramento, backup externo, IA, manutenção, equipe, produção/editoria e impostos: **não precificados; obrigatórios no orçamento total**.
- **Subtotal mínimo parcial ilustrativo:** `€ 4,99 + US$ 17–22/mês`; **NÃO é o custo total para operar com segurança**.

Este subtotal é inadequado como orçamento aprovado sem preço de backup externo/independente, custos de IA, engenharia, LGPD, suporte e contingência. Evitar apresentar margem ou viabilidade comercial a partir dele.

## 5. Custos da IA — dimensionar, não inventar preços

Na fase de orçamento, cada modelo candidato deverá informar: provedor, região, preço por tokens/segundos, políticas de armazenamento/treinamento, chamadas de ferramenta, custo de embeddings/busca, limites de saída e taxa de erro/retentativa.

**Modelo de cálculo:**
- `custo Tutor = perguntas/mês × preço médio medido por resposta completa`.
- `custo editorial = unidades produzidas × custo por revisão/geração + revisão humana + licenças`.
- Separar custo médio de entrada e saída, tokens RAG, iterações e falhas.
- Não presumir preço zero por aproveitar o servidor compartilhado n8n; n8n orquestra chamadas, não elimina custo de API/modelo.
- Teto rígido mensal **a ser aprovado** para uso de IA por produto e por empresa, com alertas preventivos; ao atingir limite, interromper apenas novas operações de IA e preservar cursos estáticos autorizados.
- Proibir publicação automática sem avaliação humana competente; custos de tradução, vídeo, revisão técnico-pedagógica e acessibilidade são orçamento editorial distinto.

## 6. Backups, segurança e monitoramento — custos imprescindíveis

Orçar **fora** da simples assinatura VPS:

1. Cópia criptografada independente da VPS de produção, preferencialmente em outro domínio de falha/provedor; armazenamento, operações, retenção, tráfego de restauração, chaves e testes periódicos.
2. Rotina de PostgreSQL com WAL/PITR, integridade, alertas de falha e ensaio de restauração **RPO 4h / RTO 8h** (metas não verificadas).
3. Hardening, patching, MFA, monitoramento de API/banco/custos, logs com minimização, segurança da origem, análise de dependências e resposta a incidente.
4. Segurança Cloudflare Free como ponto de partida; **Pro apenas quando houver ganho comprovável** para o domínio/gateway. Pro por zona pode ser mais caro que a VPS.
5. Necessidade de equipe de suporte, revisão de currículo, análise jurídica LGPD e contratos de processamento de dados.

Sem cotação, esses custos ficam **não determinados** e impedem alegar custo mensal completo. Não reduzir controles obrigatórios para encaixar um teto artificial.

## 7. Investimento editorial e produção dos primeiros 12 cursos

Os **60 cursos** são meta editorial futura em seis escolas. A primeira onda candidata de até **12 cursos** depende de conteúdo homologado e de funcionalidades reais dos produtos.

Estimar por curso, em planilha/cotação a aprovar: curadoria e pesquisa, roteirização, gravação/produção audiovisual ou demonstração, edição, transcrição, legendagem, acessibilidade, revisão pedagógica, revisão técnica, direitos/licenças, publicação e manutenção. Separar produção própria/IA de contratação externa; não supor custo zero só por usar IA.

**Não há orçamento fechado em reais ou dólares para produção dos cursos.** Exigir pelo menos uma estimativa de horas, fornecedor/equipe, custos unitários e entrega por onda antes de autorizar publicação.

## 8. Gestão de custos e gatilhos

- Painel de custos mensal por **produto, fornecedor, empresa, usuário, curso, operação e centro de custo** com totais e tendência, respeitando a privacidade.
- Separar **valores efetivamente faturados** de estimativas de tokens e minutos; conferência de cobranças, câmbio e tributos.
- Acompanhar semanalmente minutos Stream armazenados/entregues, GB R2, requests Workers, custo Tutor e agentes, CPU/RAM, erros, latência e retenções.
- Alertas configuráveis por orçamento aprovado, como **80% e 95%** (percentuais candidatos), e bloqueio de novas operações de IA ao chegar ao teto sem impactar conteúdos estáticos. Adotar limites de proteção contra uso abusivo respeitando direitos de clientes elegíveis.
- Planejar upgrade quando medições comprovarem necessidade, por saturação de CPU/RAM/IO, p95, filas, indisponibilidade ou risco. **Nunca comprar servidor dedicado como requisito inicial sem evidência**.
- Não confundir o benefício gratuito ao aluno com serviço sem custo para a Imagine; alocar despesa aos produtos que financiam o benefício segundo política financeira própria.

## 9. Critérios de aprovação financeira pendentes

| Bloqueio | Evidência exigida |
|---|---|
| P0-10-A — VPS | Preço formal por região, impostos, termo, CPU compartilhada, IP/disco, backup e performance; comparação VPS vs Public Cloud |
| P0-10-B — Cloudflare | Confirmar conta/zonas, Workers Free/Paid, Stream e R2, estimativa de vídeo e gatilhos de custo |
| P0-10-C — Backup | Orçamento para cópia externa independente, testes e objetivos de recuperação |
| P0-10-D — IA | Homologar pelo menos um modelo Tutor e um fluxo editorial com preço medido, política de dados e teto aprovado |
| P0-10-E — Cursos | Orçamento de elaboração/revisão/atualização por curso e custo da primeira onda |
| P0-10-F — Organização | Responsáveis, suporte, segurança, privacidade, tributos, câmbio e contingência |
| P0-10-G — Controle | Definir tetos mensais e autorização de excedentes antes de compras |

## 10. Proposta de decisão

**Recomenda-se aprovar somente a metodologia e a estratégia de baixo custo**, não um preço final ainda não cotado:

- Não contratar VPS, assinaturas de vídeo ou outros serviços de produção antes de necessidade, gate documental e decisão financeira.
- Preferir VPS exclusiva e econômica da Universidade para o piloto, após teste, com banco privado e backup externo; comparar VPS e Public Cloud separadamente.
- Cloudflare Workers Static Assets, Stream e R2 como opções candidatas com uso/consumo mensurado; não impor Pro sem justificativa de segurança.
- Adotar os cenários de 0/100/500/1.000 empresas e intensidades leve/base/alta para planejar vídeo e custos.
- Exigir orçamento total incluindo custos humanos e de IA e teto aprovado antes da ativação de produção.

**Estado atual de P0-10:** proposta de metodologia e referências verificadas, **aguardando ratificação**. **Não existe orçamento final homologado nem autorização de qualquer gasto ou programação.**
