# Registro de riscos, dependências e decisões residuais — Gate D

**Data:** 04/11/2026  
**Estado:** **DOCUMENTO PARA REVISÃO E RATIFICAÇÃO** dos responsáveis. Não declara gates, infraestrutura ou contratos concluídos.  
**Convenção:** P0 = bloqueio para avançar ao gate indicado; P1 = condição de etapa posterior a acompanhar. `A` designa papel responsável segundo o P0-11, **não uma pessoa já contratada ou designada**.

| ID | Risco/dependência e impacto | Gate limitante | Severidade | Papel A | Controle e evidência para encerramento |
|---|---|---|---|---|---|
| RD-01 | **Alternativa A aprovada no Gate D: R$ 0 em novas despesas documentais**; orçamento/teto de desenvolvimento ainda não aprovado | C | P0 | DIR | [Decisão D11](DECISAO-UNI-D11-ALTERNATIVA-A-CUSTO-DOCUMENTAL-ZERO-2026-11-04.md); FIN prepara custos completos da fase futura, DIR aprova antes do Gate C; nenhuma compra agora |
| RD-02 | Riscos residuais das interfaces com Portal/CRM; enumerações/contratos não homologados | C para implementação conectada; H para uso real | P0 | TEC | Mock de contrato para desenvolvimento autorizado; integração real apenas após homologação dos serviços oficiais |
| RD-03 | Política de privacidade aprovada só como base; finalização jurídica, papéis e fornecedores pendentes | H | P0 | PRI | Inventário, hipótese legal, acordo com fornecedores, transferência internacional e resposta a titulares |
| RD-04 | Provedores Cloudflare Stream/R2/Workers e VPS ainda candidatos; preços/termos e capacidade não contratados | H | P0 | TEC | Prova de custo, segurança, região, performance e aprovação de despesa |
| RD-05 | Tutor IA e orquestração central sem modelos/limites financeiros homologados | H | P0 | TEC | Avaliação do fornecedor, isolamento, uso de dados, teste de abuso e teto de custos |
| RD-06 | Meta RPO 4h/RTO 8h ainda não validada em restauração | H | P0 | TEC | Testar backup externo e PITR com evidência, reexecução de supressões e medição |
| RD-07 | Risco de mídia já autorizada continuar reproduzível durante validade do token | H | P0 | SEG | Medir T1→T3 e T1→T4, definir mitigação compatível com P0-04/P0-08 |
| RD-08 | Curso pode ensinar funcionalidade ainda não implementada/homologada | H/L | P0 | PED | Comprovar versão de produto e revisão técnica/edital antes de publicar |
| RD-09 | Equipe enxuta sem titulares e suplentes nominais para operação real | H | P0 | DIR | Nomear pessoas por papel, substitutos e revisão independente de atos críticos |
| RD-10 | Termo de encerramento Gate D não foi aprovado | D | P0 | DIR | Conferir checklist D01–D15 e obter aceite expresso; não inferir de “ok” de outros P0 |
| RD-11 | Matriz-base v5 já aprovada, mas texto histórico individual de 666 IDs não recuperado | Documental continuado | P1 | PRD | Manter proveniência e precedência; não afirmar restauração do conteúdo original |
| RD-12 | Segurança de tokens, permissões, eventos e isolamento ainda sem teste real | H | P0 | SEG | Teste de elegibilidade, eventos duplicados, RAG, URLs e limites de acesso |
| RD-13 | Catálogo de 60 cursos e primeira onda de até 12 não estão produzidos nem custeados | H/L | P0 | PED | Orçamento, conteúdo revisado, acessibilidade, licenças e publicação aprovada |
| RD-14 | Compatibilidade de novas decisões P0 com documentação histórica dispersa | D | P1 | PRD | Consolidar índice vigente e etiquetar fontes históricas contraditórias; revisão documental final |
| RD-15 | Ausência de monitoramento e suporte operacional homologados | H/L | P0 | OPS | Escalas de incidentes, alertas, cobertura, acesso privilegiado e teste de contingência |

## Política de dependência

**Gate D (documentação):** a alternativa A de RD-01 foi aprovada quanto à fase documental; revisar RD-10 e RD-14, conferir consistência dos 84 requisitos e ratificar riscos residuais e condições futuras. RD-02 a RD-09 e RD-12/13/15 podem permanecer como **condições identificadas dos gates seguintes**, desde que não haja promessa de integração real antes da homologação.

**Gate C (programação):** só após Gate D formalmente concluído e autorização separada, incluindo **orçamento e teto de desenvolvimento expressamente aprovados**, escopo, ambiente, equipe, limites financeiros e isolamento. É permitido o desenvolvimento paralelo conforme opção B; integração real com sistemas não homologados é vedada.

**Gate H (piloto) / Gate L (lançamento):** exigir evidências técnicas, jurídicas, de qualidade e de custo específicas, responsáveis nomeados e decisão Go/No-Go.

## Regras de gestão

- Não inventar titular nominal nem suprir validação humana por agente IA.
- Para cada pendência, vincular fonte, responsável por papel, condição, data de verificação e evidência futura; não fechar por decurso de tempo.
- Se fornecedor não entregar requisito aprovado (ex.: revogação individual de vídeo), propor mudança expressa antes de alterar a regra.
- Nenhum aceite documental vira automaticamente código, compra, produção de cursos ou homologação.