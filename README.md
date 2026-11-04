# Universidade Imagine — Documentação oficial de planejamento

> **Repositório privado de documentação.** Não contém implementação da plataforma, vídeos publicados, contratos de fornecedores ou homologação de ambiente.

**Situação em 04/11/2026:** a **versão-base substitutiva v5 foi aprovada funcionalmente** pelo responsável para organizar as especificações históricas que não foram integralmente recuperadas. As decisões-base P0-01 a P0-12 foram aprovadas em seus respectivos escopos; também foi aprovada a **alternativa A de R$ 0 em novas despesas da fase documental**. **O Gate D foi encerrado documentalmente em 04/11/2026 por aprovação expressa do D15**; orçamento/teto do desenvolvimento, contratações e programação **não foram autorizados**.

**Custos de backup da VPS compartilhada (04/11/2026):** [INF-DEV-04 — projeções financeiras Cloudflare R2](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/INF-DEV-04-DIMENSIONAMENTO-FINANCEIRO-BACKUP-R2-2026-11-04.md) é um estudo transversal **não aprovado como gasto**. Não altera orçamento da Universidade nem abre Gate C.

**Backup externo de desenvolvimento (04/11/2026):** o destino principal **Cloudflare R2 Standard com jurisdição UE** foi [ratificado arquiteturalmente](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-02-DESTINO-R2-EU-APROVADO-2026-11-04.md). **Restic e rotinas diárias, retenção inicial de 30 dias e testes periódicos** foram [aprovados como base técnica documental](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/DEC-INF-DEV-03-POLITICA-BACKUP-RESTIC-R2-APROVADA-2026-11-04.md). Não substitui backups de produção da Universidade; sem configuração, compra ou abertura do Gate C.

**Nova diretriz de desenvolvimento compartilhado (04/11/2026):** [Leaseweb escolhida em princípio para VPS central de desenvolvimento da Imagine](https://github.com/rafhael100/imagine-portal/blob/main/docs/infraestrutura/INF-DEV-01-VPS-CENTRAL-LEASEWEB-2026-11-04.md). A recomendação atual é VPS 3 (8 vCPU, 24 GB RAM, 300 GB NVMe), **pendente de contrato, preço, disponibilidade e autorização financeira**. A escolha não altera o bloqueio do Gate C da Universidade.

## Por onde começar

| Documento | Finalidade |
|---|---|
| [Status, aprovações e limites](docs/00-governanca/STATUS-DO-PLANEJAMENTO.md) | O que está decidido e o que permanece pendente |
| [Decisões funcionais vigentes](docs/08-fechamento-candidato/01-DECISOES-VIGENTES.md) | Regras obrigatórias da Universidade |
| [Decisão expressa de desenvolvimento paralelo (opção B)](docs/00-governanca/DECISAO-UNI-SEQ-2026-11-03.md) | Substitui a ordem histórica e preserva o bloqueio de programação até autorização específica |
| [Base funcional consolidada (14 módulos)](docs/08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md) | 84 capacidades da versão substitutiva aprovada |
| [Módulos individuais](docs/10-modulos/) | UNI-01 a UNI-14 extraídos da base v5 para consulta |
| [Contratos técnicos candidatos](docs/08-fechamento-candidato/03-CONTRATOS-TECNICOS-CANDIDATOS.md) | Acesso, eventos, IA, mídias e contingência |
| [Decisões P0 ainda abertas](docs/08-fechamento-candidato/04-DECISOES-P0-PARA-RATIFICAR.md) | O que falta aprovar para encerrar o planejamento |
| [Proposta consolidada de fechamento P0](docs/00-governanca/PROPOSTA-FECHAMENTO-P0-v0.1.md) | Demais parâmetros candidatos **não ratificados** (sessões, retenção, infraestrutura e orçamento); P0-02 foi resolvido pela opção B |
| [Contrato funcional de elegibilidade P0-03](docs/00-governanca/P0-03-CONTRATO-ELEGIBILIDADE-v0.1-PROPOSTA.md) | **Matriz funcional aprovada**; protocolos ainda não homologados |
| [Decisão de aprovação P0-03](docs/00-governanca/DECISAO-UNI-P0-03-ELEGIBILIDADE-2026-11-03.md) | Ratificação expressa do direito de acesso e das exceções |
| [P0-04 — Sessões, tokens e revogação](docs/00-governanca/P0-04-SESSOES-TOKENS-REVOGACAO-v0.1-PROPOSTA.md) | **Base de projeto aprovada**, homologação técnica pendente |
| [Decisão de aprovação P0-04](docs/00-governanca/DECISAO-UNI-P0-04-SESSOES-REVOGACAO-2026-11-03.md) | Ratificação dos limites e da distinção entre novas concessões e reprodução já autorizada |
| [P0-05 — Política-base de privacidade](docs/00-governanca/DECISAO-UNI-P0-05-2026-11-03.md) | Política-base **aprovada**, dependente de revisão jurídica e homologação dos fornecedores |
| [Decisão P0-07 — Tutor IA e segurança](docs/00-governanca/DECISAO-UNI-P0-07-AGENTES-IA-2026-11-04.md) | Política-base ratificada, homologação posterior |
| [P0-08 — Mídias protegidas](docs/00-governanca/DECISAO-UNI-P0-08-MIDIAS-2026-11-04.md) | **Arquitetura-base aprovada**; fornecedores candidatos sem contrato |
| [P0-09 — Infraestrutura e recuperação](docs/00-governanca/DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md) | **Arquitetura-base aprovada**, sem implantação nem homologação |
| [P0-10 — Metodologia orçamentária](docs/00-governanca/DECISAO-UNI-P0-10-2026-11-04.md) | **Metodologia aprovada**; orçamento integral e compras ainda não aprovados |
| [Alternativa A — decisão D11](docs/00-governanca/DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md) | **R$ 0 em novas despesas documentais**; orçamento de programação sujeito à aprovação separada |
| [Cenários e referências de preços](docs/00-governanca/P0-10-ORCAMENTO-CUSTOS-CENARIOS-v0.1-PROPOSTA.md) | Simulações, não cotação ou teto autorizado |
| [Decisão P0-11 — Governança](docs/00-governanca/DECISAO-UNI-P0-11-GOVERNANCA-2026-11-04.md) | **Matriz aprovada**; responsáveis nominais pendentes |
| [P0-12 — Encerramento e prontidão](docs/00-governanca/DECISAO-UNI-P0-12-METODOLOGIA-GATES-2026-11-04.md) | **Metodologia aprovada**; Gate D encerrado exclusivamente por D15; programação não autorizada |
| [Registro dos riscos e dependências](docs/00-governanca/RISCOS-DEPENDENCIAS-GATE-D-v0.1.md) | Pendências para documentação, programação, piloto e lançamento |
| [Auditoria final documental v0.3](docs/00-governanca/AUDITORIA-FINAL-DOCUMENTAL-GATE-D-v0.3-2026-11-04.md) | 84 requisitos, 109 critérios transversais futuros, inventário histórico e bloqueios D13–D15 |
| [D13 — Cobertura documental](docs/00-governanca/DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md) | **APROVADO**; 109 casos futuros relacionados aos módulos, sem testes executados |
| [D14 — Classificação dos riscos](docs/00-governanca/DECISAO-UNI-D14-RISCOS-RESIDUAIS-2026-11-04.md) | **APROVADO DOCUMENTALMENTE**; mantém os bloqueios de segurança, custo e homologação |
| [D15 — Decisão de encerramento documental](docs/00-governanca/DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md) | **APROVADO; GATE D ENCERRADO DOCUMENTALMENTE**; Gate C e despesas não autorizados |
| [Pré-Gate C — Checklist de orçamento e autorização](docs/00-governanca/PRE-GATE-C-CHECKLIST-ORCAMENTO-E-AUTORIZACAO-v0.1-2026-11-04.md) | **Preparação, não autorização de programação**; escopo, custos, teto e responsáveis a decidir |
| [C-00 — Decisão sobre escopo inicial](docs/00-governanca/DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md) | **APROVADO PARA PLANEJAMENTO**, somente dados fictícios e isolamento, sem código autorizado |
| [C02 — Proposta de orçamento C-00](docs/00-governanca/PRE-GATE-C-02-ORCAMENTO-FUNDACAO-v0.1-PROPOSTA.md) | **Modelo, não cotação nem teto aprovado**; verificar capacidade existente antes de qualquer compra |
| [C03 — Avaliação documental de infraestrutura](docs/00-governanca/PRE-GATE-C-03-AVALIACAO-INFRAESTRUTURA-C00-v0.1-2026-11-04.md) | Repositórios observados; **VPS, cargas e capacidade ainda não verificados ao vivo** |
| [C04 — Composição preliminar do orçamento](docs/00-governanca/PRE-GATE-C-04-ORCAMENTO-TRABALHO-E-CENARIOS-C00-v0.1-2026-11-04.md) | Estimativas ilustrativas de esforço e cenários A0/A1/B/C; **sem preço ou teto aprovado** |
| [Termo de encerramento futuro (rascunho)](docs/00-governanca/TERMO-ENCERRAMENTO-GATE-D-v0.2-RASCUNHO.md) | Sem aceite final; nenhum gate automaticamente liberado |
| [Catálogo editorial de 60 cursos](docs/03-rastreabilidade/catalogo-editorial-60-cursos-propostos.csv) | Meta curricular, **não cursos já produzidos** |
| [Inventário histórico de 986 IDs](docs/03-rastreabilidade/inventario-986-identificadores-previstos.csv) | Proveniência e lacunas; **não** equivale à conferência original |

## Regras invariantes

A Universidade Imagine é **benefício exclusivo de clientes com ao menos um serviço Imagine contratado e elegível ativo**, e de pessoas com vínculo autorizado. **Não é vendida separadamente nem possui catálogo público**. O cancelamento efetivo do último serviço elegível encerra o acesso, sem determinar eliminação imediata dos dados.

A aprendizagem é **livre e voluntária, sem provas, notas, classificação acadêmica ou certificação**. O Tutor IA é pedagógico e **não opera sistemas reais**. O Portal é a autoridade de identidade, vínculos e contratos; serviços compartilhados não devem duplicar fontes de verdade. Cursos técnicos só podem refletir funcionalidades realmente disponíveis e validadas.

## Proveniência e rigor documental

O inventário anterior registra **986 identificadores previstos**, dos quais **320 têm descrições recuperadas de aprovações nas conversas** e **666 não tiveram os textos integrais recuperados**. Esses 986 IDs ficam preservados como histórico e referência, **não como 986 requisitos canônicos integralmente verificados**. A versão-base v5 traz **84 capacidades novas** para representar prospectivamente os 14 módulos, sem alegar equivalência literal aos textos faltantes.

O documento [UNI-001 original](docs/09-fontes-historicas/UNI-001-original-imagine-crm.md) é histórico, parcialmente substituído pelas decisões posteriores. Sua diretriz original **Portal → CRM → Universidade** foi **expressamente substituída em 03/11/2026 pela opção B**: desenvolvimento paralelo condicionado ao fechamento documental e à autorização específica; o texto original é preservado apenas como histórico.

## Estrutura

- `docs/00-governanca/` — status, aprovação da base e próximos portões.
- `docs/01-fontes/` e `docs/09-fontes-historicas/` — origens e documento anterior preservado.
- `docs/02-saneamento/` — proposta de harmonização do documento original.
- `docs/03-rastreabilidade/` — inventário de 986 IDs, cobertura, decisões e catálogo.
- `docs/04-pendencias/` — P0 e fechamentos ainda pendentes.
- `docs/05-cobertura/`, `docs/06-especificacoes-recuperadas-em-conversa/`, `docs/07-auditoria/` — cobertura e material de auditoria.
- `docs/08-fechamento-candidato/` — versão-base v5, contratos técnicos, matriz de aceite e critérios de encerramento.
- `docs/10-modulos/` — apresentação por módulo das 84 capacidades da base v5.

**Esta publicação registra documentação, não é autorização para programar, contratar, publicar cursos ou homologar fornecedores.**
