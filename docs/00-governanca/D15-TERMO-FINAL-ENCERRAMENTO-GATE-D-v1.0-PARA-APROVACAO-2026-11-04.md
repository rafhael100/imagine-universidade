# D15 — Termo final proposto de encerramento documental da Universidade Imagine

**Versão:** 1.0 para aprovação  
**Data da proposta:** 04/11/2026  
**Estado vigente:** **RATIFICADO EXPRESSAMENTE EM 04/11/2026**, conforme [decisão oficial D15](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md). **GATE D ENCERRADO EXCLUSIVAMENTE DOCUMENTALMENTE**; Gate C e despesas não autorizados. Este arquivo preserva a minuta originalmente submetida, e o registro de aceite está na decisão.  
**Repositório:** `rafhael100/imagine-universidade`, documentação na branch principal.

## 1. Objeto do aceite documental registrado

O responsável institucional poderá **encerrar exclusivamente o Gate D — planejamento documental da Universidade Imagine**, reconhecendo que os critérios de planejamento foram documentados e que as pendências de implementação, orçamento, testes e homologação estão atribuídas a seus gates apropriados.

**Aprovação deste termo, se e quando concedida separadamente, NÃO será autorização de programação (Gate C), contratação, despesa, implantação, uso de dados reais, piloto, publicação de cursos nem lançamento.**

## 2. Acervo documental que fundamenta o termo

1. [Versão-base substitutiva v5](../08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md): **14 módulos, 84 capacidades**, aprovados funcionalmente, cada qual com critério de aceite. [Matriz](../08-fechamento-candidato/06-MATRIZ-DE-ACEITE.csv) com `APROVADO_BASE_FUNCIONAL` para os 84 critérios e `NAO_EXECUTADO` para todos os testes.
2. [Histórico de requisitos](../03-rastreabilidade/inventario-986-identificadores-previstos.csv): **986 IDs previstos**, **320 textos recuperados** e **666 textos individuais ausentes**, identificados no [arquivo de pendências](../03-rastreabilidade/pendencias-de-texto-individual-666-ids.csv). A v5 é base nova, **não restituição literal** dos 666 textos não recuperados.
3. [Auditoria documental final](AUDITORIA-FINAL-DOCUMENTAL-GATE-D-v0.3-2026-11-04.md), incluindo conferência entre matriz, base v5 e 14 módulos, sem divergências de capacidades ou critérios inspecionados.
4. [D13 — cobertura documental aprovada](DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md): 109 casos futuros de verificação transversal, mapeados tematicamente a módulos; matriz detalhada por caso e execução permanecem obrigatórias antes do Gate H.
5. [D14 — classificação documental dos riscos aprovada](DECISAO-UNI-D14-RISCOS-RESIDUAIS-2026-11-04.md), preservando os bloqueios RD-01 a RD-15 nos gates correspondentes, sem declarar os riscos resolvidos tecnicamente.
6. [D11 — alternativa financeira A](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md): **R$ 0,00 em novas despesas autorizadas na fase documental**; custos já existentes não são necessariamente nulos; não existe teto aprovado para a fase de desenvolvimento.
7. [Controle das decisões P0](CONTROLE-DECISOES-P0-2026-11-03.md): P0-01 a P0-12 ratificados **nos limites específicos de cada decisão**, incluindo metodologia D/C/H/L, autenticação, elegibilidade, segurança, Tutor IA, mídias e infraestrutura como bases.
8. [Opção B de desenvolvimento paralelo](DECISAO-UNI-SEQ-2026-11-03.md): autoriza **planejar** desenvolvimento paralelo ao Portal e CRM, mas condiciona o início a **Gate D fechado e Gate C posteriormente autorizado**, sem integrações reais de sistemas não homologados.
9. [Catálogo editorial](../03-rastreabilidade/catalogo-editorial-60-cursos-propostos.csv): **60 cursos candidatos** em seis escolas, até 12 candidatos à primeira onda; nenhum conteúdo declarado produzido ou publicado por esta documentação.

## 3. Conferência documental D01–D15

| Item | Estado para futura deliberação sobre este termo |
|---|---|
| D01 — base v5 e critérios | **Conferido: 14 módulos, 84 capacidades; sem testes executados** |
| D02 — proveniência dos históricos | **Conferido: 986 IDs, 320 textos localizados, 666 ausentes e documentados** |
| D03 — ordem de desenvolvimento | **Decidido: opção B, paralelismo condicionado** |
| D04 — elegibilidade | **Base funcional P0-03 ratificada**, integração oficial futura |
| D05 — sessões/revogação | **Desenho-base P0-04 ratificado**, evidência de implementação futura |
| D06 — privacidade | **Política-base P0-05 ratificada**, revisão legal e fornecedor antes de dados reais |
| D07 — contratos e eventos | **Desenho-base P0-06 ratificado**, integração oficial futura |
| D08 — Tutor IA | **Política-base P0-07 ratificada**, modelo e testes de segurança futuros |
| D09 — mídias | **Arquitetura-base P0-08 ratificada**, Stream/R2 candidatos não contratados |
| D10 — infraestrutura/backup | **Arquitetura-base P0-09 ratificada**, RPO 4h e RTO 8h são metas não testadas |
| D11 — escolha financeira documental | **Alternativa A aprovada: R$ 0 em novas despesas de documentação**; orçamento de desenvolvimento ainda pendente |
| D12 — RACI/alçadas | **Matriz funcional P0-11 aprovada**; titulares nominais e suplentes antes do piloto |
| D13 — cobertura transversal | **Aprovado documentalmente em decisão separada**, teste a teste será detalhado antes de H |
| D14 — riscos e dependências | **Aprovado documentalmente em decisão separada**, mitigação futura exigida |
| **D15 — termo de encerramento** | **APROVADO EXPRESSAMENTE EM 04/11/2026**, conforme [registro da decisão](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md) |

**Interpretação:** os itens D01–D14 possuem evidência documental/decisória suficiente para **submeter o Gate D a julgamento final**, com ressalvas explícitas e obrigações de gates posteriores. Isso não equivale a afirmar que contratos, fornecedores, segurança, LGPD ou software já estejam homologados.

## 4. Condicionantes que sobrevivem ao eventual encerramento do Gate D

### Gate C — antes de qualquer programação

- **Decisão separada, expressa**, que identifique escopo/fase do desenvolvimento, ambientes, pessoas autorizadas, dependências de Portal e CRM, limites de autonomia e responsabilidades.
- **Orçamento integral da fase pretendida e teto monetário aprovado** pela autoridade competente, incluindo custos humanos, serviços, infraestrutura e contingência; nenhuma compra presumida.
- Nenhuma alteração em produção de CRM/Portal ou integração real sem homologação oficial e autorização apropriada.
- Opção B permite evolução em paralelo **somente após autorização específica do Gate C**.

### Gate H — antes de piloto com dados/usuários reais

- Homologação de identidade, elegibilidade, autorização, sessões, revogação, APIs e eventos, mídias protegidas, RAG e Tutor IA, isolamento entre empresas e segurança.
- Parecer/aprovação de privacidade, fornecedores e tratamento de dados aplicável; responsáveis e substitutos nomeados; gastos e cotas definidos.
- Execução com **evidência real** dos casos funcionais e transversais, teste de carga, prova de recuperação RPO/RTO e atendimento aos bloqueios RD correspondentes.
- Produção editorial licenciada, revisada, acessível e compatível com funcionalidades reais homologadas.

### Gate L — antes de lançamento

- Go/No-Go institucional expresso com pareceres de segurança, operação, pedagogia, privacidade e custos; suporte, manutenção, monitoramento e contingência adequados.
- Somente cursos e integrações efetivamente homologados podem ser oferecidos a clientes elegíveis; 60 cursos são referência futura, não meta contratual obrigatória de lançamento.

## 5. Texto submetido à ratificação D15 — APROVADO

> Após verificar o checklist D01–D15, reconhecendo os limites e dependências constantes desta documentação e os riscos classificados, **aprovo o encerramento exclusivamente documental do planejamento da Universidade Imagine (Gate D)**. Confirmo que a base v5 com 14 módulos e 84 capacidades permanece como referência funcional, que os 666 textos históricos ausentes não foram recuperados e que os 109 casos de teste transversais são critérios futuros, não ensaios concluídos. Preservo a decisão de **R$ 0 em novas despesas documentais** e determino que a **programação permaneça bloqueada** até aprovação separada do orçamento/teto e do **Gate C**. Os Gates H e L exigirão homologação e autorização próprias. Não autorizo contratação, implantação, publicação nem uso de dados reais por este termo.

**Este texto foi ratificado por resposta expressa do responsável em 04/11/2026**, conforme [decisão D15](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md). O registro é uma aceitação via conversa, **não uma alegação de assinatura eletrônica qualificada** e não autoriza Gate C ou novas despesas.

## 6. Estado após a ratificação

| Gate | Situação após ratificação D15 |
|---|---|
| D — Encerramento documental | **ENCERRADO DOCUMENTALMENTE** |
| C — Programação | **NÃO AUTORIZADA** |
| H — Homologação/piloto | **NÃO INICIADO** |
| L — Lançamento | **NÃO AUTORIZADO** |

**Ratificação expressa recebida e registrada em 04/11/2026.** Próxima decisão, sempre separada: orçamento e teto de desenvolvimento e eventual autorização Gate C. Programação, contratações e lançamento ainda bloqueados.
