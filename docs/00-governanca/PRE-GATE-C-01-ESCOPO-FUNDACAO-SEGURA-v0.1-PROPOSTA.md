# Pré-Gate C / C01 — Escopo recomendado para a primeira etapa de desenvolvimento

**Data:** 04/11/2026  
**Estado vigente:** **C-00 APROVADO EM 04/11/2026 SOMENTE COMO ESCOPO INICIAL DE PLANEJAMENTO**, conforme [decisão UNI-C01](DECISAO-UNI-PRE-GATE-C01-ESCOPO-C00-2026-11-04.md). **Não autoriza programação, contratação ou gasto**. O orçamento, o teto e o Gate C continuam pendentes.  
**Referências vigentes:** [D15](DECISAO-UNI-D15-ENCERRAMENTO-DOCUMENTAL-GATE-D-2026-11-04.md), [checklist pré-C](PRE-GATE-C-CHECKLIST-ORCAMENTO-E-AUTORIZACAO-v0.1-2026-11-04.md), P0-03/P0-04/P0-06/P0-09/P0-10/P0-11, [roteiro](../08-fechamento-candidato/05-ROTEIRO-DE-IMPLEMENTACAO-E-GATES.md).  
**Objetivo:** preparar uma fundação comprovavelmente isolada para evolução em paralelo ao Portal/CRM, minimizando despesas incrementais sem sacrificar segurança.

## 1. Fase proposta: C-00 — Fundação educacional segura, somente ambiente de desenvolvimento

O primeiro ciclo autorizado **futuramente**, se o Gate C for aberto expressamente, deverá criar a base de integração e autorização da Universidade, com dados fictícios e vínculos simulados. Não iniciar pelo Tutor IA, por vídeo sob contrato, por cursos reais nem pelo lançamento.

| Etapa | Entregáveis propostos | Condição de aceite |
|---|---|---|
| C00-01 — Repositório e padrões | Estrutura da aplicação futura, documentação de instalação, controle de mudanças, pipeline de checagens sem publicação em produção e política de segredos | Isolamento de branches e credenciais, checks básicos executados após autorização |
| C00-02 — Núcleo educacional | Backend separado do CRM/Portal e **banco PostgreSQL educacional independente**, com migrações e modelos mínimos de organização, usuário pseudônimo, curso fictício, versão e estado | Dados educacionais não misturados nem acessíveis ao banco de produção do CRM |
| C00-03 — Autorizações de referência | Contratos lógicos tipados UNI-C01/02/03/04 modelados por adaptadores de identidade, vínculo e elegibilidade simulados (mocks), sem chamar serviço comercial real | Não-elegível, trial-only, cancelamento, vínculo inválido e falta da autoridade simulada são negados |
| C00-04 — Superfície estática mínima | Shell de interface de desenvolvimento e consulta a catálogo **inteiramente fictício**, sem arquivos de mídia protegida ou identidade real | Nenhum conteúdo privado está embutido no HTML/JS público; requests autorizados no backend |
| C00-05 — Segurança e rastreabilidade | Menor privilégio, logs mínimos, proteção contra acesso cruzado, idempotência de eventos fictícios, falha fechada, configuração por ambiente | Testes negativos de isolamento, replay, estados antigos e acesso sem direito aprovados tecnicamente |
| C00-06 — Qualidade e operação | Suite mínima de testes automatizados, revisão de segurança, benchmark inicial, documentação de deploy e rollback de ambiente de teste, custo incremental observado | Relatório de evidências revisado por responsável técnico e segurança; sem alegação de homologação |

**Escolha de stack nesta fase:** seguir arquitetura aprovada como **referência** (frontend estático/Workers candidato, backend de API isolado, PostgreSQL privado). Frameworks, runtime, região e provedor não estão ratificados aqui. Reuso de Laravel e ferramentas do ecossistema pode reduzir curva de manutenção, mas precisa ser comparado e aprovado tecnicamente antes do Gate C.

## 2. Exclusões e fronteiras não negociáveis

**Fora do escopo C-00:** integração oficial com Portal/CRM; contas/contratos e pessoas reais; credenciais de produção; pagamento; aprovação comercial real; envio de notificações a clientes; video Stream; arquivos R2 privados operacionais; publicação de aulas; Tutor IA e agentes editoriais reais; laboratórios; monitoramento comercial; migração de bases existentes; produção de ambientes; convite de alunos; abertura do piloto.

- Contratos de referência poderão ser **simulados localmente**, com dados fabricados que não permitam inferir ou identificar clientes reais.
- Nenhum serviço externo pago ou mudança de configuração em produção poderá ser iniciado como subproduto desta fase.
- Se algum teste precisar consumir IA, rede, armazenamento, compute ou monitoramento faturáveis, exige orçamento e autorização prévios, sem exceção pela pouca escala.

## 3. Separação técnica e direitos

- A Universidade jamais se torna fonte oficial de contratos/vínculos; o Portal e os serviços comerciais mantêm a autoridade e a reconciliação.
- Mock não concede direito comercial real nem permite acesso de clientes.
- n8n central pode ser conectado **somente em fase posterior e autorizada**, com credenciais e filas separadas. Esta etapa não provisiona agentes.
- Nenhuma base de produção do CRM/Portal será lida, copiada, migrada ou alterada.
- Uso de Cloudflare Workers/Stream/R2, VPS e sistemas de backup externos depende de verificação de capacidade, cotação, segurança e aprovação financeira; **não ativar serviço cobrado silenciosamente**.

## 4. Sequência da implementação futura

1. **C-00 — Fundação segura com mocks e dados fictícios (este escopo candidato).**
2. **C-01 — Autenticação e elegibilidade oficialmente homologadas**, após APIs reais do Portal disponíveis e compatíveis.
3. **C-02 — Catálogo e mídia protegidos**, após orçamento, revisão editorial, integração de autorização e provedores aprovados.
4. **C-03 — Tutor IA consultivo e ajuda**, com isolamento/RAG homologados e teto de IA aprovado.
5. **C-04 — Progresso opcional, recomendações e indicadores minimizados; depois laboratórios**, de forma modular e controlada.

Essas fases são **propostas de execução futura**, não autorizações de todos os ciclos. A aprovação de um ciclo nunca aprova automaticamente os seguintes.

## 5. Evidências obrigatórias para decidir se o C-00 pode começar

| Ponto | Documento/validação ainda necessária |
|---|---|
| Escopo | Ratificar o conjunto C00-01 a C00-06 como **escopo candidato**, sem dar autorização de código |
| Orçamento | Custo total em dinheiro e em horas/equipe, teto de despesas reais, compromissos preexistentes e contingência (ver [C02](PRE-GATE-C-02-ORCAMENTO-FUNDACAO-v0.1-PROPOSTA.md)) |
| Ambiente | Inventário real da VPS de desenvolvimento, GitHub, serviços e isolamento. Provar que não reduz disponibilidade/segurança de outros produtos |
| Responsáveis | Indicar responsáveis pelas revisões técnica, segurança e financeira, com alçadas e eventual revisor independente |
| Gate | Aprovação de **um ato específico, posterior**, que explicite ambiente, escopo, orçamento/teto e início da programação |

## 6. Recomendação e natureza da decisão

**Foi aprovado C-00 como primeiro escopo candidato de planejamento**, por exigir menos custo inicial, reduzir riscos das integrações em paralelo e permitir demonstrar os controles de autorização antes da inclusão de mídias e agentes.

**Até que haja aprovação expressa do Gate C:** não escrever código da aplicação, ativar serviços, provisionar servidores, executar testes reais ou alterar qualquer sistema. Este documento é **planejamento pré-execução**.
