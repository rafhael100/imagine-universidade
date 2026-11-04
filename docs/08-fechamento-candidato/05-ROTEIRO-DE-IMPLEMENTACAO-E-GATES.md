# Roteiro de implementação futura — sem autorização de programação
## Gate D — Encerramento do planejamento (AINDA NÃO ATINGIDO)
Critérios: pacote-base ratificado, 12 P0 resolvidos em sua dimensão decisória, contratos e comportamentos esperados definidos, custos estimados e aprovados, sequência histórica esclarecida, artefatos versionados no repositório autorizado.

## Gate C — Autorização de programação (AINDA NÃO CONCEDIDA)
Decisão expressa do usuário e preservação dos cronogramas oficiais do Portal e CRM. A existência deste roteiro não substitui autorização de código. Se a ordem histórica Portal → CRM → Universidade permanecer, este gate só pode abrir após os critérios de conclusão desses dois produtos.

## Fases candidatas após Gate C

| Fase | Escopo principal | Aceite de fase |
|---|---|---|
| 0 — Fundação segura | Serviço de identidade/autorizações, contrato de entitlement e integração do Portal, ambiente de desenvolvimento | Falha de acesso nega recursos, testes de isolamento e eventos definidos |
| 1 — Catálogo essencial | UNI-01/02/03/04 básico, vídeos e arquivos protegidos, primeira onda de cursos homologados | Conteúdos exclusivos acessíveis apenas a elegíveis, publicação revisada |
| 2 — Tutor e ajuda | UNI-05/10, Tutor IA exclusivamente consultivo, busca homologada e custos | Sem ferramentas operacionais, fallback estático e limites testados |
| 3 — Experiência contínua | UNI-07/08/09/11/12, progresso opcional, recomendações e métricas minimizadas | Sem notas/certificados/ranking, privacidade validada |
| 4 — Laboratórios avançados | UNI-06 e aprofundamentos da fábrica de cursos | Isolamento, orçamento e simulações seguras homologadas |

## Requisitos que nunca podem ser sacrificados para antecipar lançamento
Exclusividade contratual; direito vigente; isolamento por empresa/pessoa; ausência de ação operacional pelo Tutor; proteção de mídias; fontes e versionamento de materiais; conformidade de conteúdo com recursos reais; privacidade; controle de custo; logs e incidentes; aprovações críticas.

## Critérios de teste para software implementado (futuro)
- Cancelamento último serviço bloqueia interface, API, vídeo, Tutor; outro serviço ativo mantém direito.
- Trial gratuito isolado e não cliente ficam sem acesso.
- Funcionário sem vínculo e pessoa entre empresas não veem conteúdos/dados indevidos.
- Eventos duplicados, atrasados e fora de ordem não reativam direitos.
- Falha de IA não derruba leitura de conteúdos estáticos já autorizados.
- Tutor jamais executa ações reais; prompt injection e ferramentas proibidas são bloqueados.
- Publicação exige aprovação e compatibilidade de versão; conteúdo suspenso não é entregue.
- Simulações usam dados fictícios e não expõem dados reais.
- Backups e restaurações respeitam revogação de direitos.

## Critério de liberação ao cliente (Go/No-Go)
Exige execução e evidências de homologação técnica, privacidade, segurança, qualidade editorial, orçamento e aprovação formal. Não antecipar conclusão por checklist meramente marcado.
