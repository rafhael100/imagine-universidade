# UNI-C05 — provisionamento seguro da organização educacional do cliente

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Meta
Conectar uma empresa oficialmente elegível do Portal à Universidade de forma simples, sem cadastro duplicado de cursos, sem usuário manual na Universidade e sem liberação por cabeçalhos arbitrários.

## Implementado
- `UniversityTenantProvisioner::initialize`: aceita somente `PortalGrant` válido, de permissão exata `university:view`, empresa diferente do espaço editorial, sujeito não vazio, revisão positiva e validade curta; usa chave única para criar empresa **uma vez** mesmo com múltiplas requisições.
- `POST /universidade/private/initialize`: endpoint privado protegido pelo middleware de verificação do Portal e CSRF web; não aceita companyId/subjectId do corpo, fornece apenas `ready=true` ou erro genérico.
- Testes de inicialização idempotente com dois tenants sintéticos e negativas para administrador/editorial, sessão inexistente ou não verificada.

## Escopo e segurança
O backend **continua fechado** porque `UnavailablePortalAuthority` segue como provider padrão. A função não obtém credenciais, não cria login, não publica curso, não acessa APIs externas e não pode ser acionada sem grant aprovado pelo backend. A coluna `synthetic_key` ainda é candidata, aguardando contrato real de ID do Portal.

O usuário e a empresa nunca são recebidos de query/body/header como prova de elegibilidade. Não existe prova de serviço elegível no banco educacional: ela DEVE vir do Portal no contrato de identidade/autorização homologado.

## Fluxo previsto
1. Cliente entra no Portal e escolhe Universidade.
2. Portal verifica serviço elegível e vínculo autorizado; emite sessão de servidor válida.
3. Interface da Universidade solicita `POST /universidade/private/initialize` com cookies seguros e token CSRF.
4. Middleware confirma `university:view` a cada chamada. O provisionador cria/consulta o registro técnico da empresa; não é necessário duplicar cursos.
5. Cliente lê catálogo compartilhado e marca seu progresso; a empresa e o sujeito são sempre derivados do grant verificado.

## Pendências obrigatórias
- Contrato SSO do Portal e sessão oficial: <https://github.com/rafhael100/imagine-portal/issues/848>
- Testes PHP/PHPUnit e HTTP reais, verificação de corridas no PostgreSQL, isolamento multiempresa, políticas de auditoria e rollback.
- Aprovar se o onboarding deve ocorrer no primeiro acesso ou em fluxo de provisionamento servidor-a-servidor.
- Não ativar o provider real nem publicar o acesso antes dos gates de segurança, LGPD e implantação.

**Sem migrações aplicadas, sem credenciais reais, sem dependências novas, sem deploy ou merge.**
