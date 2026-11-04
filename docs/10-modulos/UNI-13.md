# UNI-13 — Especificação-base de trabalho

> **Origem:** desdobramento da versão-base substitutiva v5, aprovada funcionalmente. **Não é transcrição literal** dos requisitos históricos originais do módulo. Sem autorização de programação.

[Fonte-base integral](../08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md) · [Decisões vigentes](../08-fechamento-candidato/01-DECISOES-VIGENTES.md) · [Pendências P0](../08-fechamento-candidato/04-DECISOES-P0-PARA-RATIFICAR.md)

## UNI-13 — Identidade e integrações

**Responsabilidade:** identidade e integrações. **Fonte histórica:** escopo geral aprovado de UNI-13, sem integral conferência de requisitos originais.

| ID candidato | Capacidade consolidada | Critério de aceite proposto |
|---|---|---|
| BASE-UNI-13-01 | Integrar login e direitos ao Portal | Contratos não se alteram pela Universidade |
| BASE-UNI-13-02 | Separar autenticação, elegibilidade e autorização por recurso | Usuário autenticado sem contrato elegível é negado |
| BASE-UNI-13-03 | Eventos versionados e reconciliação | Evento duplicado não duplica acesso |
| BASE-UNI-13-04 | Revogação de vínculos e último contrato | Sessões, API, vídeos e Tutor passam a negar acesso conforme política |
| BASE-UNI-13-05 | Isolamento de múltiplos vínculos e empresas | Mudar empresa não compartilha dados privados |
| BASE-UNI-13-06 | Interfaces de serviços compartilhados governadas | n8n não é fonte de verdade |

**Limite de fase:** implementação do núcleo será priorizada conforme dependências e orçamento. Recursos de automação avançada e laboratório podem ficar em fases futuras sem revogar sua aprovação de escopo.
