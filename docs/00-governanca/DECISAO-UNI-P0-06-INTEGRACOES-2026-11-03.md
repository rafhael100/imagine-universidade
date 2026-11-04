# DEC-UNI-P0-06 — Aprovação do desenho de integração, APIs e eventos

**Data:** 03/11/2026
**Decisão:** APROVADO COMO BASE TÉCNICA DE PROJETO.
**Registro de aceite:** resposta "ok" à pergunta expressa sobre aprovar o P0-06 conforme documentado, para prosseguir ao P0-07.
**Documento-base:** [P0-06 — Integrações, APIs e eventos v0.1](P0-06-INTEGRACOES-APIS-EVENTOS-v0.1-PROPOSTA.md).

## Escopo ratificado

1. **Fontes de verdade preservadas:** Portal/serviços comerciais para identidade, vínculos, contratação, vigência e elegibilidade; Universidade para dados e conteúdo educacionais; serviços centrais para IA, auditoria, segurança e suporte; n8n apenas para orquestração, nunca como confirmação de estado comercial.
2. **Oito contratos lógicos de referência**, UNI-C01 a UNI-C08: identidade, elegibilidade, mudança de direito, mudança de vínculo, conteúdo homologado, mídia privada, Tutor IA e auditoria. A aprovação NÃO afirma que essas APIs já existem.
3. **Segurança por recurso e contexto:** autenticação do serviço e do usuário, escopo, audiência, empresa, revisão de direito e menor privilégio; a simples posse de token ou URL não concede autorização.
4. **Versionamento de contratos e eventos:** proposta de OIDC/OAuth 2.0 com PKCE e BFF para autenticação humana; credenciais de serviço limitadas; eventos tipados, versionados e correlacionados, com envelope candidato compatível com CloudEvents.
5. **Confiabilidade:** mecanismo de outbox/inbox ou equivalente, deduplicação por fonte e ID, controle por revisão de agregado, efeitos idempotentes, concorrência segura, retentativas com limites e reconciliação com a autoridade oficial.
6. **Falha segura:** estado inconclusivo não é sucesso; evento técnico não altera sozinho um contrato; indisponibilidade da autoridade nega novas concessões sem decisão vigente válida.
7. **Privacidade:** minimizar eventos e contextos, separar empresas, evitar transporte de dados operacionais desnecessários; nenhuma gravação direta pelo Tutor nos demais produtos.
8. **Critérios de aceite HT-UNI-INT01 a HT-UNI-INT15** aceitos como plano de verificação futura, não como testes executados.

## Limites da aprovação

- Os nomes reais de endpoints, estados comerciais, schemas, autenticação de máquinas, métodos de assinatura e cronograma de migração devem ser compatibilizados com as integrações existentes do Portal/CRM e formalizados antes da implementação correspondente.
- OIDC/OAuth, CloudEvents, outbox/inbox e mTLS são **padrões candidatos**, não prova de disponibilidade nos ambientes atuais.
- Alterações relevantes no desenho que contrariem esta decisão exigem ratificação expressa.
- Integrações e aulas vinculadas a produtos só podem ser efetivamente ativadas após homologação das funcionalidades correspondentes.
- P0-03, P0-04 e P0-05 permanecem vigentes com suas ressalvas de homologação técnica e jurídica.

**Estado:** P0-06 encerrado para a definição do desenho técnico inicial; homologação operacional e integração real são atividades posteriores.
**Próximo:** P0-07 — Tutor IA, agentes e controles de segurança.
**Programação:** não autorizada. Desenvolvimento paralelo da Universidade somente após fechamento documental e autorização específica, conforme opção B aprovada.
