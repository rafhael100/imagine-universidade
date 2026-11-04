# Universidade Imagine — Documentação oficial de planejamento

> **Repositório privado de documentação.** Não contém implementação da plataforma, vídeos publicados, contratos de fornecedores ou homologação de ambiente.

**Situação em 03/11/2026:** a **versão-base substitutiva v5 foi aprovada funcionalmente** pelo responsável para organizar as especificações históricas que não foram integralmente recuperadas. O planejamento **não está encerrado tecnicamente**: as decisões P0 e o orçamento de implantação permanecem para ratificação, e a programação não foi autorizada.

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
| [Contrato candidato de elegibilidade P0-03](docs/00-governanca/P0-03-CONTRATO-ELEGIBILIDADE-v0.1-PROPOSTA.md) | Matriz de estados e critérios de aceite preparada para ratificação; ainda não homologada |
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
