# Controle de decisões P0 — Universidade Imagine

**Atualização:** 04/11/2026  
**Finalidade:** índice cronológico das decisões mais recentes. Este documento prevalece sobre estados antigos das minutas não atualizadas, sem substituir seu conteúdo histórico.

| Tema | Estado atual | Registro |
|---|---|---|
| P0-01 — Base substitutiva v5 | Aprovada funcionalmente | [Base v5](../08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md) |
| P0-02 — Ordem do desenvolvimento | Opção B aprovada; paralelismo condicionado | [Decisão](DECISAO-UNI-SEQ-2026-11-03.md) |
| P0-03 — Elegibilidade | Matriz funcional aprovada | [Decisão](DECISAO-UNI-P0-03-ELEGIBILIDADE-2026-11-03.md) |
| P0-04 — Sessões e revogação | Parâmetros-base aprovados, homologação futura | [Decisão](DECISAO-UNI-P0-04-SESSOES-REVOGACAO-2026-11-03.md) |
| P0-05 — Privacidade e retenção | Política-base aprovada, condicionada à revisão jurídica | [Decisão](DECISAO-UNI-P0-05-2026-11-03.md) |
| P0-06 — Integrações, APIs e eventos | **APROVADO como base técnica**; protocolos reais e homologação pendentes | [Decisão](DECISAO-UNI-P0-06-INTEGRACOES-2026-11-03.md) e [especificação](P0-06-INTEGRACOES-APIS-EVENTOS-v0.1-PROPOSTA.md) |
| P0-07 — Tutor IA e agentes | **APROVADO como política-base de governança e segurança** | [Decisão](DECISAO-UNI-P0-07-AGENTES-IA-2026-11-04.md) e [especificação](P0-07-TUTOR-IA-AGENTES-SEGURANCA-v0.1-PROPOSTA.md) |
| P0-08 — Mídias e materiais protegidos | **APROVADO como arquitetura-base; fornecedores ainda candidatos** | [Decisão P0-08](DECISAO-UNI-P0-08-MIDIAS-2026-11-04.md) e [especificação](P0-08-MIDIAS-MATERIAIS-PROTEGIDOS-v0.1-PROPOSTA.md) |
| P0-09 — Infraestrutura, backups e recuperação | **APROVADO como desenho inicial**: RPO 4h e RTO 8h (metas) | [Decisão P0-09](DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md) e [especificação](P0-09-INFRAESTRUTURA-BACKUP-RECUPERACAO-v0.1-PROPOSTA.md) |
| P0-10 — Orçamento e escalabilidade | **METODOLOGIA APROVADA**; [D11-A: R$ 0 de novas despesas documentais](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md); orçamento e teto do desenvolvimento pendentes | [Decisão P0-10](DECISAO-UNI-P0-10-2026-11-04.md) e [análise](P0-10-ORCAMENTO-CUSTOS-CENARIOS-v0.1-PROPOSTA.md) |
| P0-11 — Responsáveis e alçadas | **APROVADO como matriz funcional**; nomes e limites financeiros pendentes | [Decisão P0-11](DECISAO-UNI-P0-11-GOVERNANCA-2026-11-04.md) e [matriz RACI](P0-11-RESPONSAVEIS-ALCADAS-RACI-v0.1-PROPOSTA.md) |
| P0-12 — Encerramento e prontidão | **METODOLOGIA APROVADA**; Gate D aberto, Gate C não autorizado, Gate H e L não iniciados/autorizados | [Decisão P0-12](DECISAO-UNI-P0-12-METODOLOGIA-GATES-2026-11-04.md) e [checklist D01–D15](P0-12-GATES-ENCERRAMENTO-ACEITE-v0.1-PROPOSTA.md) |

## Nota de precedência

O UNI-001 original permanece histórico. A opção B de desenvolvimento paralelo substituiu expressamente a sequência obrigatória anterior.

P0-05 aprovou prazos como **base de projeto**, não como parecer jurídico ou contratação de fornecedor. A conformidade e os ajustes legalmente necessários continuam no gate final.

P0-06 foi aprovado como base técnica em 03/11/2026; os oito contratos lógicos são referência de planejamento e ainda precisam ser compatibilizados com APIs oficiais e homologados antes de entrar em operação.

**Decisão financeira D11:** [alternativa A ratificada](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md), com **R$ 0,00 de novas despesas autorizadas nesta fase documental**. Orçamento/teto de desenvolvimento exigem aprovação posterior antes do Gate C. **Auditoria final v0.3:** [relatório](AUDITORIA-FINAL-DOCUMENTAL-GATE-D-v0.3-2026-11-04.md), com 84 requisitos v5, 109 casos de testes futuros, histórico de 986 IDs (320 com texto e 666 ausentes), 60 cursos candidatos, riscos e documentos revisados. **Gate D permanece aberto (D15)**, após a [aprovação documental de D13](DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md).

**Auditoria documental anterior (histórico):** [auditoria v0.2](AUDITORIA-DOCUMENTAL-GATE-D-v0.2.md) confirmou 84 requisitos únicos, alinhados textualmente aos 14 módulos e à base funcional. Todos seguem `APROVADO_BASE_FUNCIONAL` / `NAO_EXECUTADO`. Há [registro de riscos e dependências](RISCOS-DEPENDENCIAS-GATE-D-v0.1.md) e [minuta de termo futuro](TERMO-ENCERRAMENTO-GATE-D-v0.2-RASCUNHO.md). **Gate D continua aberto** por decisão financeira D11, revisão dos riscos e aceite formal D15. Nenhuma programação autorizada.

**Auditoria inicial P0-12 (histórico):** [verificação dos 84 critérios da matriz](AUDITORIA-INICIAL-P0-12-2026-11-04.md) — 84 IDs únicos, seis por módulo, testes não executados; status documental do CSV precisa de conciliação. O Gate D permanece pendente.

**D13 APROVADO documentalmente:** [decisão oficial](DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md) e [mapa de cobertura](D13-MAPA-COBERTURA-TRANSVERSAL-v0.1-2026-11-04.md). **D14 APROVADO DOCUMENTALMENTE:** [decisão](DECISAO-UNI-D14-RISCOS-RESIDUAIS-2026-11-04.md) e [matriz de riscos](D14-PROPOSTA-ACEITE-RISCOS-GATE-D-v0.1-2026-11-04.md). **D15 NÃO ASSINADO**, Gate D aberto e programação não autorizada.

A publicação da documentação **não autoriza programação, contratação de infraestrutura nem publicação de cursos**.
