# P0-05 — Privacidade, LGPD, direitos dos titulares e retenção (v0.1)

**Estado:** PROPOSTA PARA RATIFICAÇÃO, NÃO APROVADA.  
**Data:** 03/11/2026.  
**Projeto:** Universidade Imagine, benefício educacional exclusivo para clientes com serviços Imagine elegíveis ativos e usuários vinculados.  
**Decisões prévias vinculantes:** GOV-01–13, P0-03 (elegibilidade), P0-04 (sessões/revogação); não vender cursos separadamente, não dar acesso público, não permitir ao gestor acessar automaticamente conversas pessoais do Tutor IA.  
**Natureza:** política operacional candidata, sujeita à avaliação jurídica, designação de responsáveis, mapeamento de operadores e tratamento de riscos. Não é parecer jurídico nem política pública já publicada.

## 1. Princípios de privacidade aprovados funcionalmente

1. Separar **direito de acesso** de **prazo de guarda**. O cancelamento efetivo do último serviço elegível bloqueia o uso da Universidade, mas não é uma ordem automática de apagar todos os registros.
2. Minimização, finalidade explícita, segregação de pessoa/empresa, segurança, registro de acesso administrativo e revisão periódica do ciclo de vida.
3. Conversas pessoais do Tutor IA não são visíveis por padrão a gestores empresariais. Indicadores administrativos devem ser agregados, com supressão de grupos pequenos ou outras proteções contra reidentificação.
4. Não importar automaticamente leads, CRM, dados financeiros, mensagens de clientes, anexos ou cadastros operacionais para ensinar um usuário. Só compartilhar contexto técnico estritamente necessário e autorizado.
5. Dados de conteúdo pedagógico e progresso têm autoridade educacional própria; cadastro e vínculo comercial pertencem à autoridade central Imagine.
6. Solicitações de privacidade continuam acessíveis por **canal externo de atendimento**, mesmo após bloqueio/cancelamento de acesso à Universidade.
7. Retenção de dados educacionais é **independente** da retenção geral de CRM e dos backups dos demais produtos Imagine.

## 2. Regras jurídicas que NÃO devem ser confundidas com escolhas comerciais

A LGPD **não determina um prazo universal de retenção** para todos os dados pessoais. O prazo deve estar associado à finalidade, à necessidade e à base legal cabível. Encerrada a finalidade, aplicar eliminação ou as exceções previstas na lei (arts. 15 e 16), com registro justificável.

Referências verificadas:
- [ANPD — Perguntas frequentes sobre tratamento e retenção](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes)
- [Gov.br — Explicação dos arts. 15–16 e prazo por finalidade](https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/privacidade-e-protecao-de-dados-pessoais/por-quanto-tempo-os-dados)
- [ANPD — Direitos dos titulares](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes)
- [ANPD — Comunicação de incidente de segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- [ANPD — Regulamento de comunicação de incidentes, Resolução nº 15/2024](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [ANPD — Transferência internacional, Resolução nº 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)

**Distinção legal relevante:** o Regulamento de Comunicação de Incidentes da ANPD exige manter **registros de incidentes de segurança com dados pessoais por no mínimo cinco anos** (inclusive incidentes não comunicados). **Isso NÃO significa exigir cinco anos de todos os logs de acesso, chats ou progresso educacional.** A comunicação de incidente que possa causar risco ou dano relevante observa, em regra, prazo de **três dias úteis** conforme regulamentação vigente, ressalvadas exceções aplicáveis; a operação deve ter processo de triagem e escalonamento.

## 3. Matriz de retenção — PROPOSTA para avaliação e ratificação

| Categoria | Prazo candidato | Início da contagem / ressalvas |
|---|---|---|
| Preferências educacionais, favoritos e progresso pessoal | **120 dias** após perda efetiva da última elegibilidade | Enquanto houver benefício válido, conservar somente o necessário; recontratação dentro do prazo poderá restaurar histórico autorizado |
| Conversas do Tutor IA e conteúdo de mensagens | **30 dias** por interação, com supressão antecipada diante de solicitação válida; após perda de acesso, sem novas conversas | Salvar apenas quando imprescindível à funcionalidade; não confundir com registros de segurança e não expor a empregador |
| Memórias/sumários pedagógicos personalizados, se vierem a existir | **Não criar nesta fase sem finalidade, consentimento ou outra hipótese legal válida e política específica** | Não inferir retenção perpétua de preferência do usuário |
| Histórico temporário de geração de conteúdo e arquivos transitórios | **24 horas** após encerramento da tarefa | Exceção apenas para materiais oficiais aprovados/versionados ou investigação justificada |
| Logs técnicos ordinários de autenticação, autorização e eventos | **180 dias** como teto operacional candidato | Excluir segredos/tokens e dados excessivos; verificar finalidade, riscos, contratos e obrigações legais específicas |
| Registros formais de incidentes de segurança com dados pessoais | **mínimo legal de 5 anos**, salvo obrigação superior | Contagem a partir do registro, conforme Resolução CD/ANPD nº 15/2024; repositório com acesso restrito |
| Backups rotativos do banco educacional | **30 dias** como prazo candidato de ciclo | Proteção, criptografia, testes de restauração e reexecução de supressões legítimas após restauração |
| Dados contratuais, fiscais, cobrança ou litígio | **Não herdar prazo educacional** | Permanecem nas autoridades comerciais e obedecem políticas e obrigações próprias, fora da Universidade |
| Conteúdos institucionais publicados, licenças e versões | **Conforme ciclo editorial e direitos de propriedade intelectual** | Não misturar com dados pessoais de alunos |

**Os prazos candidatos de 120/30/24/180/30 dias não são prazos impostos pela LGPD e não estão aprovados.** O mínimo de cinco anos é obrigação específica dos **registros formais de incidentes de segurança com dados pessoais**. Confirmar eventual norma posterior ou obrigação setorial antes da implantação.

## 4. Mapa de responsabilidades, fundamentos e fornecedores

- Elaborar inventário de dados: `categoria → titular → controlador/operador → finalidade → hipótese legal → origem → destino → prazo → base de justificativa → eliminação → direitos do titular`.
- Determinar por operação se Imagine atua como controladora, operadora ou controlador conjunto; não presumir que a empresa cliente pode examinar conversas pessoais de empregados.
- **Não usar consentimento como base automática de todos os tratamentos.** Avaliar base de execução contratual ou legítimo interesse quando cabíveis, com teste de finalidade/necessidade/balanceamento e salvaguardas; dados sensíveis demandam fundamento específico.
- Manter DPA/acordo de tratamento, suboperadores, instruções e limites de finalidade; evitar usar dados de alunos para treinar modelos de IA de terceiros sem base, informação e autorização adequadas.
- Documentar localização/país de API, banco, mídia, backup e fornecedor de IA. Transferências internacionais dependem de mecanismo válido, análise e documentação conforme LGPD e normas da ANPD.
- Definir encarregado/canal de privacidade conforme enquadramento aplicável e responsáveis por resposta, exclusão e segurança.

## 5. Limites específicos para Tutor IA

1. O Tutor funciona como orientador pedagógico. Não deve receber dados operacionais de clientes nem permissões de escrita.
2. Coletar identificadores mínimos (usuário pseudônimo, contexto empresarial autorizado, curso/tópico, versão homologada) e enviar ao modelo só a informação necessária.
3. Política clara de histórico: limite de 30 dias por interação é **candidato**, e mudanças exigem nova aprovação e transparência. Possibilidade de uso sem persistência longa deve ser considerada.
4. Remover/mascarar acidentalmente documentos pessoais, informações financeiras, dados de crianças e categorias sensíveis quando indevidos.
5. Impedir indexação cruzada de conversas entre empresas e funcionários; limitar uso de dados por fornecedor e exigir garantias contratuais.
6. Auditoria técnica utiliza metadados mínimos; logs de segurança não viram arquivo universal das conversas.

## 6. Encerramento de serviço, reativação e direitos

- Perda de elegibilidade revoga imediatamente **novas concessões de acesso** conforme P0-03/P0-04, independentemente do prazo de retenção.
- Histórico pessoal eventualmente mantido só poderá ser recuperado mediante recontratação elegível, identidade/vínculo corretos e finalidade válida.
- Solicitações de acesso, correção, portabilidade aplicável, revisão de decisões automatizadas pertinentes, oposição e eliminação devem ter canal independente da plataforma cancelada.
- A resposta a pedidos deve verificar identidade de forma proporcional, registrar finalidade e decidir sobre restrições legais. Não prometer eliminação instantânea de cópias imutáveis de backup, mas garantir bloqueio de acesso e expurgo pelo ciclo estabelecido.
- Após restauração de backup, aplicar novamente registros de supressão e de revogação, para não ressuscitar dados apagados nem direitos cancelados.
- Enviar informações necessárias ao titular de forma clara e distinguir indisponibilidade de acesso à plataforma de indisponibilidade do direito LGPD.

## 7. Governança e segurança

- Controle por papéis, isolamento por empresa, criptografia em trânsito/repouso, monitoramento, backup protegido, rastreabilidade de acesso administrativo, bloqueio a exportações indiscriminadas.
- Privacidade desde o projeto, minimização de métricas, coleta apenas de dados justificados e sem acompanhamento coercitivo de desempenho de funcionários.
- Processo de incidentes separado de logs ordinários, com registro formal, classificação de risco e mecanismo de comunicação à ANPD/titulares quando aplicável.
- Revisão periódica de retenção, contratos com fornecedores, transferências e política pública de privacidade.
- Se houver curso para menores de idade no futuro, exige avaliação regulatória e de desenho própria; **não presumir que esse público está autorizado**.

## 8. Testes futuros (não realizados agora)

| Código | Critério de aceite |
|---|---|
| HT-UNI-PRIV01 | Dados de aluno não aparecem em outra empresa/vínculo |
| HT-UNI-PRIV02 | Gestor não lê conversas pessoais de Tutor IA sem fundamento e permissão específicos |
| HT-UNI-PRIV03 | Perda do último direito retira acesso sem apagar automaticamente dados conservados legalmente |
| HT-UNI-PRIV04 | Recontratação restaura somente o que permanece licitamente guardado e permitido |
| HT-UNI-PRIV05 | Solicitação de titular é atendida por canal pós-cancelamento |
| HT-UNI-PRIV06 | Prazos de expurgo por classe são aplicados e auditáveis |
| HT-UNI-PRIV07 | Restauração de backup reaplica supressões e revogações válidas |
| HT-UNI-PRIV08 | Chamadas a IA minimizam dados e respeitam limites de suboperadores |
| HT-UNI-PRIV09 | Exportação não revela conversas privadas de terceiros |
| HT-UNI-PRIV10 | Registro formal de incidente respeita prazo de cinco anos e processo de triagem/comunicação |

## 9. Pontos para decisão expressa

Solicitar ratificação **da matriz de categorias e dos prazos candidatos** da Seção 3 (120 dias progresso após perda de direito; 30 dias conversas; 24 horas arquivos temporários; 180 dias logs ordinários; 30 dias backups), **desde que condicionados a revisão jurídica e finalidade**. O prazo de no mínimo cinco anos para registros formais de incidentes de dados é tratado como obrigação regulatória, não escolha opcional.

O aceite do responsável não dispensa validação jurídica, documentação de papéis e hipóteses legais, localização de fornecedores, resposta a incidentes, processos de supressão e testes futuros. Não libera programação, contratação nem publicação.

**Próxima etapa após ratificação:** P0-06 — contratos de identidade, APIs, eventos, idempotência, reconciliação e limites de autoridade.
