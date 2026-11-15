# Universidade Imagine — C-03: backend privado mínimo e avanço controlado
**15/11/2026 — DRAFT / NO-MERGE / NO-DEPLOY**

## Diretriz do produto
A Universidade continua uma área **exclusiva dos clientes Imagine**, com três espaços: **Metodologia Visitas → Leads → Clientes**, **Cursos de negócios** e **Treinamentos dos sistemas Imagine**. Objetivo: poucas telas, conteúdo útil, aulas curtas, navegação fácil e progresso individual. Sem catálogo público, cobrança de cursos, provas, certificados, fóruns ou gamificação.

## Implementação desta branch
- Middleware Laravel RequireUniversityGrant: obtém apenas da sessão de servidor o identificador da empresa e a credencial opaca do Portal, pede verificação de permissão a cada requisição, nega falha/ausência/revogação e nunca confia em headers, query ou formulário como prova. Respostas privadas com no-store.
- Binding do PortalAuthority no AppServiceProvider para UnavailablePortalAuthority, que **nega 100% das requisições** enquanto não houver contrato/homologação de SSO.
- Rotas privadas Laravel sob /universidade/private com separação estrita de view e manage. Proteção CSRF do grupo web aplicada a métodos de escrita; nenhuma rota pública de cursos/login/SSO.
- UniversityCatalogRepository: consultas por organização vinculada ao PortalGrant do servidor; retorna apenas cursos/aulas publicados para alunos, gerencia rascunhos com verificação de tenant e grava conclusão com insertOrIgnore sob restrição única no banco.
- UniversityController: valida campos e IDs, cria/edita curso e aula, publica/despublica e oferece leitura de catálogo e progresso.
- Versões publicadas **não são editadas em seu histórico**: despublicar arquiva a versão e cria novo rascunho com aulas clonadas e novos IDs; progressos anteriores ficam preservados na versão antiga. Republicar cria uma nova experiência de aprendizagem sem afirmar que alunos concluíram aulas alteradas.
- Testes PHPUnit de acesso padrão negado para rotas cliente/admin, sessões não verificadas, identidade em cabeçalhos e ausência de catálogo público, além de regressões da validade curta do grant. **Testes escritos, ainda não executados.**

## Rotas previstas (todas 403 com provider atual)
| Método | Caminho (prefixo /universidade/private) | Capacidade |
|---|---|---|
| GET | /courses | university:view |
| GET | /courses/{courseId}/lessons | university:view |
| GET | /lessons/{lessonId} | university:view |
| GET | /lessons/{lessonId}/progress | university:view |
| POST | /lessons/{lessonId}/complete | university:view |
| GET | /admin/courses | university:manage |
| GET | /admin/courses/{courseId}/lessons | university:manage |
| POST | /admin/courses | university:manage |
| PATCH | /admin/courses/{courseId} | university:manage |
| POST | /admin/courses/{courseId}/lessons | university:manage |
| PATCH | /admin/lessons/{lessonId} | university:manage |
| POST | /admin/courses/{courseId}/publish | university:manage |
| POST | /admin/courses/{courseId}/unpublish | university:manage |

**Nenhum endereço acima deve ser publicado sem SSO Portal e homologação.** A rota /up pertence ao bootstrap genérico e não expõe cursos. Os arquivos preview/index.html e preview/admin.html são apenas exemplos locais, sem acesso à API.

## Segurança: obrigatórios antes de permitir clientes reais
1. Obter do Portal contrato técnico autenticado para sessão e verificação de direito: sujeito, empresa, serviço elegível ativo, permissão exata, revisão, expiração e revogação; falhar fechado em indisponibilidade. Não inventar endpoint, segredo, callback ou URL.
2. Implementar adaptador backend-to-backend com TLS, autenticação entre serviços, limites de timeout, saneamento de logs e revisão independente. Sessão originada no servidor, com proteção CSRF, cookie HttpOnly/Secure e prevenção de fixação; nunca inserir credenciais no JS.
3. Prova de isolamento: curso, versão, aula e progresso obrigatoriamente resolvidos por educational_organization_id, nunca por ID de recurso desacompanhado do tenant. Confirmar mapeamento real empresa Portal ↔ organização educacional (coluna histórica synthetic_key é provisória).
4. Migrar PostgreSQL em **banco de homologação isolado**, com planos de backup, reversão e teste de upgrade. Validar índices, unicidade de slug e corrida entre publicação, alterações e conclusão.
5. Auditar ações administrativas e alterações de elegibilidade sem registrar tokens nem dados sensíveis; definir retenção e descarte com LGPD e contratos aplicáveis.
6. Validar o tratamento de conteúdo HTML/Markdown na interface: padrão texto simples, sem HTML arbitrário. Limites de tamanho, revisão editorial e acessibilidade.
7. Executar lint PHP, PHPUnit (Unit + Feature), testes integrados PostgreSQL e navegação real cliente/admin e dispositivos. A suíte feature usa chave de criptografia **sintética exclusiva de testes**.
8. Publicar apenas mediante aceite formal SEG/LGPD/infraestrutura/Portal e autorização de deploy. As PRs C-00, C-01 e C-02 seguem em revisão.

## Cenários P0 de aceite
- Anônimo, conta sem serviço elegível, trial isolado, empresa incorreta ou sessão vencida: negado.
- Portal fora do ar ou revogação: nova leitura, conclusão e administração negadas.
- Cliente elegível com view: consulta somente aulas publicadas da sua empresa, marca somente o próprio progresso, não administra.
- Operador com manage: gerencia apenas a empresa e os recursos explicitamente autorizados; não ganha view por consequência.
- Nova aula em rascunho: nunca aparece no catálogo do aluno.
- Conclusão duplicada: um único registro por empresa, aluno e aula.
- Arquivar versão e republicar: histórico antigo preservado e aulas novas com IDs próprios, sem herdar indevidamente conclusão.
- IDs de recursos de outros clientes: resposta genérica (não revelar metadados).
- Requisições de escrita: CSRF, autenticação e autorização validados no backend.

## Limitações importantes da entrega
**Não integrado de verdade ao Portal.** Ainda não existem sessão emitida pelo Portal, produção, migração aplicada, seed de dados de cliente, testes executados nem auditoria operacional. O modelo de curso por organização (e eventual distribuição de conteúdos globais compartilhados entre clientes) precisa de decisão técnica antes de gerar registros reais. O provedor padrão nega tudo. O admin offline não está conectado ao CRUD.

**Sem merge, deploy, VPS, fornecedores pagos, dados pessoais ou contas reais.**

## Próxima etapa recomendada
- Validar sintaxe/execução com Composer e PHP na sandbox autorizada.
- Conferir contrato real Portal (SSO/autorização) nas branches homologadas do ecossistema, sem assumir que branch de pesquisa equivale a contrato aprovado.
- Implementar conector e resolver tenant, habilitar RBAC real e auditar; então integrar a interface ao backend em homologação.
- Produzir primeiro uma trilha curta de metodologia e os tutoriais das telas efetivamente lançadas, sem produzir dezenas de cursos antes de testar o interesse dos clientes.
