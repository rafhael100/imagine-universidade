# P0-07 — Tutor IA, agentes educacionais e segurança de IA (v0.1)

**Estado:** PROPOSTA PARA RATIFICAÇÃO — NÃO APROVADA, NÃO IMPLEMENTADA.  
**Data:** 03/11/2026.  
**Escopo:** desenho de segurança, governança, autonomia, conteúdo, custos, observabilidade e testes do Tutor IA e dos agentes de produção educacional.  
**Fontes internas:** versão-base v5, UNI-04/UNI-05/UNI-11/UNI-14, P0-03 (elegibilidade aprovada), P0-04 (sessões aprovadas como base), P0-05 (privacidade aprovada como base), P0-06 (integrações aprovadas como base).  
**Referências técnicas:** [OWASP Top 10 para aplicações de LLM (edição 2025)](https://genai.owasp.org/llm-top-10/) e [NIST AI RMF — perfil de IA generativa](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf). Não são certificados de conformidade, e a publicação desta proposta não significa que controles ou modelos tenham sido homologados.

## 1. Objetivo

Disponibilizar orientação educacional contextual e produção editorial assistida por IA, com custo compatível com a fase inicial da Imagine, **sem permitir que o Tutor se torne agente de execução operacional nos produtos** e sem expor dados pessoais, empresariais ou conteúdos não homologados.

**Fronteiras obrigatórias:**
- O **Tutor IA** é um orientador de aprendizagem; seu resultado é explicação e referência educacional. Não é suporte técnico oficial, vendedor, administrador de CRM ou operador de sites.
- **Agentes editoriais** podem propor, revisar e montar rascunhos de cursos em ambiente controlado, mas não concedem a si mesmos aprovação para conteúdo crítico nem escalam permissões.
- O **Portal e autorizador central** decidem identidade, vínculo e direito educacional. IA e n8n não alteram contratos nem concedem direito.
- O **gerenciador de modelos e políticas central Imagine** rege modelos, limites, credenciais e contingência; Universidade tem suas próprias configurações educacionais, catálogo e registros, sem replicar um motor central independente.
- Conteúdo sobre produtos Imagine só descreve funcionalidades efetivamente implementadas, homologadas e disponibilizadas.

## 2. Papéis e separação de poderes

| Componente | Ações candidatas permitidas | Ações proibidas sem nova decisão |
|---|---|---|
| Tutor IA | Explicar, orientar, sugerir curso, esclarecer dúvidas com conteúdo homologado e citar fonte | Escrever em CRM/Portal/Sites/Performance, executar SQL, enviar e-mail a terceiros, abrir chamado em nome do cliente, aprovar contratos |
| Agente de curadoria | Sugerir temas, detectar lacunas/desatualizações, classificar fontes, preparar pauta | Alterar regra de elegibilidade, revelar dados de outro tenant, publicar autonomamente material sensível |
| Agente roteirista/produtor | Gerar rascunhos de texto, roteiro, transcrição, exercícios opcionais e descrição de acessibilidade | Lançar curso ao público/cliente sem fluxo editorial aprovado, usar conteúdo sem licença |
| Agente revisor auxiliar | Revisar ortografia, coerência, acessibilidade, possíveis erros e divergência com versão real | Homologar sozinho conteúdo técnico novo ou publicar alteração crítica |
| Agente de monitoramento | Ler alertas e métricas minimizadas, detectar padrões, propor ação | Alterar fornecedor, liberar verba ou fazer rollback destrutivo por conta própria |
| Serviço de publicação | Publicar apenas versão com aprovação editorial competente e comando tipado autorizado | Executar texto livre do modelo como ação privilegiada |

**Autonomia proposta:** (I) leitura/consulta educativa, (II) elaboração de rascunhos e recomendações, (III) ações editoriais previamente tipadas, autorizadas e rastreáveis. O nível III **não** concede publicação de alto risco sem aprovação humana; alterações financeiras, contratuais, permissões, privacidade e exclusões continuam sob autoridade humana/sistema oficial.

## 3. Inventário de ferramentas e canais

- Tutor terá acesso a: **busca de conteúdo educacional homologado**, **consulta limitada ao catálogo**, **leitura de contexto de aula/curso e versão** e **recomendação de trilha**, sob permissão prévia.
- Tutor **não terá** credenciais de escrita, comandos livres, shell, SQL, navegador com sessão administrativa, API de campanhas ou ferramentas para operar serviços dos clientes.
- Recuperação de conteúdo (RAG) por `course_id + version + status=homologated + authorized_scope`; nenhuma fonte recuperada é tratada como instrução privilegiada.
- Cada chamada a ferramenta exige checagem determinística fora do LLM: pessoa, vínculo, empresa, recurso, finalidade, escopo, limites e revisão.
- Agentes editoriais usam interfaces tipadas e versionadas de **rascunho**, **revisão**, **submissão** e **publicação autorizada**; não usam strings de modelo como comandos ou configurações de acesso.
- Chaves e segredos ficam em cofre/ambiente seguro do serviço, nunca em conteúdo de prompt ou navegador.
- Egress externo por allowlist e proxy controlado, com bloqueio de URLs internas, metadados de nuvem, RFC1918 e destinos não autorizados; nenhum fetch arbitrário pedido pelo usuário.

## 4. Segurança contra ataques e erros de IA

**Ameaças mínimas a cobrir:**
1. **Prompt injection** no chat, em cursos, transcrições, documentos e resultados de busca: separar dados de instruções, não permitir invocar ferramentas com privilégio, verificar a resposta antes de usar.
2. **Divulgação indevida:** não revelar dados, conversas, configurações, chaves, mensagens de sistema ou fontes privadas. Criptografia, escopo e isolamento por tenant aplicados antes de consultar o modelo.
3. **Agência excessiva:** proibir execução livre e privilégios de escrita no Tutor; agente editorial recebe apenas capacidades estritas da tarefa.
4. **RAG/corpus contaminado:** ingestão somente de fontes permitidas, rastreáveis, verificadas e aprovadas; analisar mudanças, licenças e versões.
5. **Saída insegura:** tratar texto do modelo como não confiável; escape/sanitização em HTML/Markdown, sem executar JavaScript ou SQL retornados.
6. **Alucinação e confiança excessiva:** citar versão e fonte de conteúdo, distinguir informação ausente e encaminhar suporte oficial; nunca declarar funcionalidades ainda não lançadas.
7. **Consumo ilimitado:** cotas e limites por empresa e por pessoa com proteção contra loops, chamadas recursivas e abusos.
8. **Dependências e provedores:** catálogo homologado, política de atualização/rollback, contratos e incidentes, sem troca automática para modelo não autorizado.

Referências OWASP LLM 2025: LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM08 Vector and Embedding Weaknesses, LLM09 Misinformation e LLM10 Unbounded Consumption.

## 5. Governança de modelos, memória, dados e privacidade

- Seleção pelo gerenciador central homologado, com `model_id`, versão, região de processamento, propósito, tarifa, limite por operação, registro de alteração, política de contingência e avaliação.
- **Não** presumir modelo, plano, fornecedor ou preço definitivo. Custos reais e aprovação financeira pertencem ao P0-10.
- Encaminhar ao modelo apenas dados mínimos: identificador pseudonimizado, idioma, curso/tópico/versão, trecho autorizado e a pergunta necessária; redigir/remover dados pessoais não pertinentes.
- **Nunca** introduzir memória longa, indexação ampla ou uso secundário de chats de estudantes sem uma finalidade, base legal, política de consentimento quando cabível e aprovação específica, respeitando P0-05.
- Conversas pessoais do Tutor não ficam automaticamente disponíveis para gestores. Relatórios corporativos são agregados, controlados e protegidos contra reidentificação.
- Treinamento de modelos por fornecedores com dados dos estudantes é proibido por padrão até análise contratual, transparência e autorização jurídica adequadas.
- Retenção inicial do histórico pessoal do Tutor: **30 dias por interação** como política-base aprovada em P0-05, condicionada à revisão jurídica e ao contrato com o fornecedor.
- Se a IA central hospedar agentes de vários produtos Imagine em um mesmo n8n/servidor, exigir **segregação de credenciais, fluxos, contexto e execução**, filas e limites por produto/tenant; a Universidade não concede acesso transversal ao CRM.

## 6. Qualidade pedagógica e publicação editorial

1. Cada resposta do Tutor deve partir de conteúdo **homologado**, adequado à versão do produto e ao direito de acesso.
2. Se informação não estiver no corpus, indicar incerteza; preferir instrução de consulta ao material oficial ou encaminhamento à central de suporte competente.
3. Uma alteração de versão do Portal/CRM/Sites/Performance aciona análise de impacto curricular, não atualização automática de todas as aulas sem revisão.
4. Produção: proposta de pauta → rascunho IA → revisão pedagógica → revisão técnica de produto e licenças → aprovação editorial humana competente → publicação versionada.
5. O autor automatizado não pode homologar a própria publicação crítica; as aprovações devem ter registro, responsável e evidência.
6. Ensino segue MIA voluntário, **sem provas, notas, certificados ou ranking acadêmico**, e não condiciona o uso dos serviços à conclusão de curso.

## 7. Limites de consumo e custos propostos

- Contabilizar por empresa e contexto, usuário, agente, tipo de operação, modelo, tokens/uso, custo estimado e custo efetivo conciliado.
- Orçamento global mensal do produto e limites por empresa/usuário, com alertas preventivos e interrupção de operações de IA ao atingir teto rígido aprovado. **Aulas estáticas não devem ser bloqueadas por falta de crédito de IA**, se usuário ainda for elegível.
- Filas e prioridades separadas para Tutor e produção de cursos, evitando que lote editorial retire capacidade de atendimentos educacionais.
- Caches apenas de materiais homologados, sem compartilhamento de dados pessoais entre empresas; deduplicação segura de solicitações.
- Propor limites numéricos e preços em P0-10, antes de ativar cobrança de modelos; **não presumir franquia do CRM** nem criar cobrança independente ao aluno.
- Contingência: alternar somente para modelo previamente homologado; se nenhum estiver disponível, informar indisponibilidade da tutoria e manter catálogo estático autorizado.

## 8. Supervisão e incidentes

- Dashboard institucional com taxas de respostas sem fonte, falhas de recuperação, consumo por categoria, tentativas de abuso e alertas de possível vazamento, com minimização de dados pessoais.
- Revisão humana e reavaliação de modelo em incidentes graves, respostas perigosas ou alterações importantes de fornecedor.
- Central de Aprovações compartilhada para pedidos críticos, com responsáveis e alçadas; sem autopublicação autônoma.
- Segurança pode **suspender imediatamente** modelo, ferramenta, integração ou publicação suspeita, sem alterar registros comerciais. Reativação exige avaliação autorizada.
- Auditoria distingue decisão do modelo, autorização do sistema, ação de um serviço externo, versão do conteúdo e aprovação humana.
- Logs técnicos não copiam conversa inteira por padrão; política de guarda segue P0-05.

## 9. Matriz de testes futuros — não realizados

| ID | Critério verificável |
|---|---|
| HT-UNI-AI01 | Tutor responde com fontes homologadas e cita versão de conteúdo aplicável |
| HT-UNI-AI02 | Tutor recusa/ignora solicitação de executar ação real no CRM ou Portal |
| HT-UNI-AI03 | Injeção de prompt em trecho RAG não modifica política nem autoriza ferramenta |
| HT-UNI-AI04 | Aluno de empresa A não recupera dados ou conversas de B |
| HT-UNI-AI05 | Gestor não acessa automaticamente histórico individual de conversa |
| HT-UNI-AI06 | Modelo sem fonte declara incerteza e encaminha canal correto |
| HT-UNI-AI07 | Saída de modelo não injeta script/HTML perigoso em interface |
| HT-UNI-AI08 | Modelo desativado não é utilizado após revogação oficial |
| HT-UNI-AI09 | Falha de fornecedor permite acesso ao catálogo estático autorizado |
| HT-UNI-AI10 | Cota excedida bloqueia só novas operações IA, sem suspender cursos estáticos |
| HT-UNI-AI11 | Fluxo de publicação crítica exige revisão humana e não permite autoaprovação |
| HT-UNI-AI12 | Corpus contaminado ou desatualizado é impedido de publicação/retrieval |
| HT-UNI-AI13 | Egress bloqueia destinos de rede internos ou não permitidos |
| HT-UNI-AI14 | Credencial de agente editorial não executa comandos fora do escopo |
| HT-UNI-AI15 | Troca de fornecedor não extrapola região, finalidade ou política de dados |
| HT-UNI-AI16 | Consumo anormal provoca alerta, limita operação e não ultrapassa teto aprovado sem autorização |

## 10. Limites desta ratificação e próximas definições

**Pedido de aprovação:** ratificar o P0-07 como **política-base de governança e segurança dos agentes educacionais**, incluindo separação Tutor/produção, catálogo de ferramentas, limites de autonomia, aprovação humana crítica, RAG homologado, isolamento e controles de custo.

**Continuam para fechar em outros P0:** fornecedores/modelos específicos e testes (P0-10/P0-12), políticas e DPA (P0-05), mídia protegida (P0-08), topologia e recuperação (P0-09), valores de custo e orçamento (P0-10), responsáveis e alçadas (P0-11).

**Não há autorização de código, contratação, implantação nem publicação.**
