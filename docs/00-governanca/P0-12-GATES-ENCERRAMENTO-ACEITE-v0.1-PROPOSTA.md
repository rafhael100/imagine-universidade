# P0-12 — Encerramento documental, prontidão, critérios de aceite e gates

**Data:** 04/11/2026.  
**Status:** **METODOLOGIA APROVADA EM 04/11/2026** pela [DEC-UNI-P0-12](DECISAO-UNI-P0-12-METODOLOGIA-GATES-2026-11-04.md). **Nenhum gate foi declarado cumprido** e nenhum orçamento, código ou lançamento autorizado.  
**Escopo:** encerrar o planejamento da Universidade Imagine sem exigir testes de software inexistente e sem confundir aprovação de especificações com liberação de programação, contratação, implantação ou lançamento.  
**Fontes:** versão-base substitutiva v5 (84 capacidades em 14 módulos), histórico de 986 identificadores previstos (320 descrições recuperadas e 666 textos individuais ausentes), decisões P0-01 a P0-11, matriz de aceite candidata e roteiro de implementação futuro.  
**Precedência:** opção B aprovada expressamente: programação paralela com Portal/CRM pode ser permitida **apenas após o encerramento documental e autorização específica de programação**. A obrigação histórica de concluir Portal e CRM primeiro foi substituída, mas as integrações e os tutoriais de funcionalidades não homologadas continuam bloqueados.

## 1. Quatro gates que não podem ser confundidos

| Gate | Marco e finalidade | O que autoriza | Situação em 04/11/2026 |
|---|---|---|---|
| **D — Documentação concluída** | Critérios funcionais e técnicos, decisões, arquitetura, riscos, dependências, responsabilidades e orçamento de planejamento suficientes, validados e assinados | Solicitar **autorização separada** para desenvolver; não executa código automaticamente | **NÃO CONCLUÍDO**; esta proposta P0-12 está aberta e P0-10 ainda não tem envelope financeiro completo aprovado |
| **C — Autorização expressa de programação** | Decisão posterior do responsável com escopo, fase, ambiente, orçamento e dependências | Iniciar somente o desenvolvimento expressamente autorizado, inclusive paralelo quando cabível | **NÃO CONCEDIDA** |
| **H — Homologação/piloto** | Produto implementado e verificações reais aprovadas de segurança, elegibilidade, IA, privacidade, mídia, recuperação, qualidade editorial, acessibilidade e custos | Realizar piloto real nos limites aprovados; não é publicação geral automática | **NÃO INICIADO** |
| **L — Lançamento** | Resultado Go/No-Go, operação, equipe, fornecedores, suporte e continuidade aprovados | Liberar a Universidade aos clientes elegíveis no escopo homologado | **NÃO AUTORIZADO** |

### Regra invariável

A criação de repositório, a publicação de propostas, a assinatura do Gate D ou a aprovação da opção B não constituem, isoladamente, autorização do Gate C, compras, acesso a dados reais, publicação ou Gate L.

## 2. Checklist de encerramento do **Gate D** (documental)

Para declarar o planejamento **concluído**, exigir evidência documental e decisão expressa em cada linha, sem fingir execução de teste futuro:

| ID | Critério documental necessário | Situação inicial | Evidência ou pendência |
|---|---|---|---|
| D01 | Base substitutiva v5, 14 módulos, 84 capacidades e critérios de aceite aprovados e íntegros | **Parcial** | Aprovação funcional existe; conferir integridade, links e consistência editorial na revisão final |
| D02 | Histórico separado: 986 IDs previstos, 320 descrições recuperadas e 666 textos ausentes sem reivindicar recuperação literal | **Aprovado conceitualmente** | Preservar rastreabilidade, procedência e versões históricas |
| D03 | Ordem de implementação expressamente definida | **Aprovado** | [Opção B](DECISAO-UNI-SEQ-2026-11-03.md) |
| D04 | Direito educacional e estados funcionais | **Aprovado** | [P0-03](DECISAO-UNI-P0-03-ELEGIBILIDADE-2026-11-03.md) |
| D05 | Política-base de sessões, revogação, recursos e metas de credenciais | **Aprovado como base** | [P0-04](DECISAO-UNI-P0-04-SESSOES-REVOGACAO-2026-11-03.md); mecanismos reais verificados no Gate H |
| D06 | Política-base de retenção/privacidade, com responsáveis pelo parecer e condicionantes | **Base aprovada; validação jurídica pendente** | [P0-05](DECISAO-UNI-P0-05-2026-11-03.md); registrar revisão LGPD e itens pré-tratamento |
| D07 | Contratos lógicos, interfaces, eventos, idempotência e reconciliação definidos | **Aprovado como base** | [P0-06](DECISAO-UNI-P0-06-INTEGRACOES-2026-11-03.md); mapeamento dos sistemas oficiais antes da integração real |
| D08 | Governança de IA, ferramentas permitidas, riscos e aprovação editorial | **Aprovado como base** | [P0-07](DECISAO-UNI-P0-07-AGENTES-IA-2026-11-04.md); modelos e fornecedores específicos ainda sujeitos a homologação |
| D09 | Proteção de mídias, URLs assinadas, acesso por recurso e política editorial | **Aprovado como base** | [P0-08](DECISAO-UNI-P0-08-MIDIAS-2026-11-04.md); Stream/R2 ainda candidatos |
| D10 | Arquitetura, isolamento, monitoramento, recuperação e metas RPO/RTO | **Aprovado como base** | [P0-09](DECISAO-UNI-P0-09-INFRA-BACKUP-2026-11-04.md); metas não verificadas |
| D11 | Metodologia financeira e **envelope de custos para a fase pretendida**, com custos obrigatórios, teto e critério de autorização de despesas | **ALTERNATIVA A APROVADA PARA A FASE DOCUMENTAL** | [Decisão D11](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md): R$ 0 em novas despesas da documentação; orçamento e teto de desenvolvimento devem ser aprovados antes do Gate C. Não equivale a custo interno zero |
| D12 | Matriz RACI, classes de risco, responsáveis por decisão e exigências de designação nominal | **Aprovado como base** | [P0-11](DECISAO-UNI-P0-11-GOVERNANCA-2026-11-04.md); pessoas e substitutos ainda a designar antes do piloto |
| D13 | Planos de teste futuros escritos e critérios objetivos de aprovação por módulo e integração | **APROVADO DOCUMENTALMENTE** | [Decisão D13](DECISAO-UNI-D13-COBERTURA-DOCUMENTAL-2026-11-04.md): 84 capacidades únicas, 109 casos transversais por famílias; testes não executados e rastreabilidade caso a caso exigida no Gate H |
| D14 | Lista final de dependências, riscos residuais, responsabilidades, prazos e portas que bloqueiam programação ou somente piloto | **PENDENTE** | Elaborar quadro de pendências com status e dono antes de solicitar encerramento |
| D15 | Termo formal final de encerramento, referências e **aceite expresso** do responsável, após conferência dos anteriores | **PENDENTE** | Termo histórico candidato não está assinado; redigir termo novo sem afirmações obsoletas |

**Atenção:** os estados acima são revisão inicial de documentos. “Aprovado como base” não significa que testes foram executados nem que uma API externa já está pronta. Não usar “100% concluído”: D11 foi decidido pela alternativa A e D13 foi aprovado documentalmente, mas D14 e D15 seguem abertos, assim como o Gate D.

## 3. Pendências organizadas por momento

### 3.1 Impeditivas de encerramento do planejamento (Gate D)
- **Alternativa A aprovada:** novas despesas autorizadas no Gate D = **R$ 0**; registrar alocação interna, sem prometer que pessoal/recursos atuais não geram custo. Orçamento e teto monetário de desenvolvimento **pendentes e obrigatórios antes do Gate C**; não confundir subtotal público de VPS/Stream com orçamento operacional.
- **Revisão documental concluída em D13:** preservar os 84 critérios da base v5, sem inventar os 666 textos históricos. Rastreabilidade teste a teste e evidências serão obrigações posteriores do Gate H.
- Consolidar o **mapa de dependências, riscos e responsabilidades**, incluindo enumerações oficiais que podem ficar condicionadas à futura entrega do Portal/CRM, com uma regra explicitada de não integração até homologação.
- Concluir o **termo final de encerramento e sua aprovação**, em momento separado desta proposta.

### 3.2 Impeditivas da programação (Gate C)
- Gate D formalmente aprovado.
- Autorização **separada e específica** do responsável para iniciar código, definindo fase, escopo, limites de infraestrutura, orçamento aprovado, pessoas autorizadas e repositórios envolvidos.
- Ambiente isolado e credenciais corretas; sem alterar produção de CRM/Portal ou ativar subscrições por inferência.
- Desenvolvimento paralelo permitido, mas dependências externas permanecem simuladas/contratadas tecnicamente até homologação oficial e autorização adequada.

### 3.3 Impeditivas de uso real/piloto (Gate H)
- Pessoas responsáveis e substitutos **designados** com canais de contato; alçadas financeiras numericamente fixadas para compras/consumo.
- Fornecedores reais de VPS, banco, CDN, vídeo, backup e IA avaliados com contratos, região e privacidade.
- Revisão jurídica/operacional da política P0-05 concluída antes de tratar dados reais ou integrar modelos de terceiros.
- Testes executados e evidenciados para autorização, isolamento, eventos, sessões, mídias, Tutor, publicação, acessibilidade, backup, recuperação, segurança, observabilidade e custo.
- Primeiros cursos efetivamente produzidos, revisados e homologados, sem ensinar funcionalidades ainda não disponíveis.

### 3.4 Impeditivas de lançamento (Gate L)
- Piloto/ensaios aprovados; equipe operacional e suporte disponíveis; incidentes e recuperação testados; orçamento/limites aceitos.
- Go/No-Go final por autoridade institucional, considerando pareceres técnicos, segurança, privacidade e pedagógicos; aceites documentados.
- Lançamento limitado a conteúdos e integrações de produtos efetivamente homologados. O catálogo de 60 cursos é meta de ondas, não obrigação de lançamento.

## 4. Matriz mínima de evidências de qualidade

| Domínio | Evidência documental no Gate D | Evidência de software nos Gates H/L |
|---|---|---|
| Elegibilidade | Contrato lógico P0-03/P0-06 + estados e critérios | Testes de cancelamento último contrato, multicontrato, trial, vínculo e fonte indisponível |
| Sessões | Política P0-04, escopos e tempos aprovados | Expiração backend, tokens e T1→T3; T1→T4 medido separadamente |
| Mídias | P0-08 e classificação de objetos | R2 privado, Stream assinado, expiração e sem vazamento por CDN |
| Tutor IA | P0-07, catálogo de ferramentas e fontes homologadas | Prompt injection, isolamento, falha do modelo, nenhum comando operacional |
| Privacidade | Política-base P0-05 e mapa de revisão jurídica | Direitos pós-cancelamento, retenção por classe, exclusão e backup restaurado |
| Integrações | P0-06 com idempotência, versões e autoridade | Evento perdido/duplicado, reconciliação, timeout inconclusivo |
| Conteúdo | Base v5 e fluxo humano de aprovação | Aulas acessíveis e homologadas, fontes/licenças, compatibilidade com produto real |
| Recuperação | P0-09, plano de PITR, RPO/RTO e auditoria | Cópia externa verificada, restauração dentro das metas ou correção documentada |
| Financeiro | P0-10, cenário e teto autorizado da fase | Custo faturado, alertas, bloqueio de consumo IA por teto e continuidade estática |
| Governança | P0-11, RACI e alçadas funcionais | Logs de aprovação, designações nominais, dupla revisão/controle compensatório |

## 5. Política de status e rastreabilidade

Cada requisito deve possuir: ID canônico, módulo, versão, critério de aceite, fonte aprovada, responsável pela decisão, status documental, dependências, evidência de teste futuro e status de implementação **separados**.

Status documentais propostos: `RASCUNHO`, `EM_REVISAO`, `APROVADO_BASE`, `APROVADO_FINAL`, `SUBSTITUIDO_HISTORICO`, `PENDENTE_DECISAO`.  
Status técnicos futuros: `NAO_INICIADO`, `EM_DESENVOLVIMENTO`, `EM_TESTE`, `HOMOLOGADO`, `EM_PRODUCAO`, `SUSPENSO`.  
Nunca converter automaticamente `APROVADO_BASE` em `HOMOLOGADO`. Testes não executados são `NAO_EXECUTADO`, não "passou".

## 6. Termo futuro de encerramento documental — modelo, não assinatura

> O responsável pela Universidade Imagine declara, após verificar os itens D01–D15 e as pendências impeditivas, o encerramento do **planejamento documental** da base substitutiva v5, reconhecendo a preservação do histórico incompleto. Essa declaração **não autoriza início de programação, novas contratações, uso de dados reais ou lançamento**. O desenvolvimento paralelo seguirá a opção B e exigirá Gate C separado.

Este texto é apenas **modelo**, não foi ratificado nem assinado. Não emitir termo preenchido automaticamente após a aprovação da proposta P0-12.

## 7. Pedido de aprovação do P0-12

**Proposta:** ratificar os quatro gates (D/C/H/L), a matriz de evidências, a separação entre aceites de planejamento e de software e o checklist D01–D15 como **metodologia de encerramento**. A ratificação do P0-12 **não** significa que todos os itens D01–D15 passaram; requer auditoria documental e termo futuro de fechamento formal.

Após essa ratificação, o passo correto será a **auditoria final de cobertura dos 84 critérios e das dependências** e a consolidação das pendências financeiras D11, sem iniciar programação nem gastos.

**Situação presente:** Gate D aberto; Gate C não autorizado; Gate H não iniciado; Gate L não autorizado.
