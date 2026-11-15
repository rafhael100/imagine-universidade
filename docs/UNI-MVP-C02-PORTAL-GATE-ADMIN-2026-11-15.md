# Universidade Imagine — C-02: acesso pelo Portal e administração enxuta
**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY**

## Decisão de escopo
A Universidade é um benefício exclusivo para clientes elegíveis da Imagine, simples e sem catálogo público. Pilares do conteúdo:
1. Metodologia **Visitas → Leads → Clientes**.
2. Cursos práticos de negócios.
3. Treinamentos dos sistemas Imagine com interfaces homologadas.

O MVP não oferece matrícula avulsa, cobrança educacional, notas, exames, certificado, fórum nem gamificação. A metodologia MIA em sete etapas permanece vigente; este recorte não altera suas etapas.

## O que foi implementado nesta branch
- PortalAuthority define contrato de verificação de permissão pelo backend do Portal;
- UnavailablePortalAuthority sempre nega novas concessões;
- PortalAccessGate compara a autorização retornada com empresa, capacidade requerida, sujeito, revisão e expiração; erro/exceção resulta em negação;
- PortalGrant guarda o resultado, **não constitui prova criptográfica** e não pode ser construído a partir de claims do navegador;
- tests/Unit/PortalAccessGateTest.php contém cenários positivos sintéticos e negativos; **não executado até testes em sandbox**;
- preview/admin.html permite criar rascunhos, adicionar/remover aulas, ajustar categoria, salvar e simular publicação em armazenamento local; não autentica ninguém, não persiste em banco e não altera a biblioteca do aluno;
- preview/index.html inclui link para prévia administrativa, sem abrir qualquer endpoint HTTP do Laravel.

## Integração real com Portal — pendências obrigatórias
Não há adaptador operacional de autenticação/autorização. Para construí-lo, obter primeiro o contrato aprovado de identidade do Portal, sem usar segredos nesta PR.

1. **Identidade e sessão:** navegação iniciada no Portal; credencial opaca de sessão acessível apenas no backend, transportada por mecanismo seguro; sem tokens em URL/localStorage. Cookies de sessão devem ter Secure, HttpOnly, SameSite apropriado, proteção CSRF e expiração.
2. **Empresa:** verificar empresa ativa vinculada ao sujeito; qualquer troca de empresa obriga nova autorização. O tenant usado no banco vem da decisão verificada no servidor, nunca de um cabeçalho arbitrário.
3. **Elegibilidade:** confirmar contratação elegível ativa, permissão do sujeito, revisão e revogação. Falta de resposta, timeout, vínculo inativo, trial-only ou último serviço encerrado **negam acesso**.
4. **Permissões exatas:** university:view permite ler cursos e atualizar apenas o próprio progresso. university:manage é permissão operacional separada; não deduzir do papel de cliente.
5. **Frescor:** revalidar autorização em operações sensíveis e a cada concessão; definir TTL máximo e estratégia de revogação. Expiração de PortalGrant nunca é aceita se já vencida.
6. **Dados:** curso/aula/progresso devem ser resolvidos no PostgreSQL por company_id autorizado e usuário da sessão, não por IDs fornecidos como prova. Revisar políticas transversais de cursos por organização, incluindo eventual conteúdo compartilhado entre tenants.
7. **Auditoria:** gravar publicação/edição, exclusão, revogação, alteração de permissões e acesso negado sem registrar tokens, senhas ou conteúdo sensível. Garantir política de retenção.
8. **Admin:** antes de conectar a interface administrativa ao backend, separar capacidades de editor/revisor, validar conteúdo e status de publicação no servidor e proteger mudanças com CSRF.

O contrato técnico da autorização deve ser revisado e aprovado com o Portal antes de registrar qualquer provedor real; não inventar API ou endpoint não homologado.

## Jornada de teste mínima (quando houver integração)
| Pessoa ou condição | Ler curso | Marcar aula | Editar curso |
|---|---|---|---|
| Cliente ativo com permissão view | Sim | Somente próprio | Não |
| Operador Imagine com manage + escopo correto | Conforme permissão adicional view | Conforme permissão adicional view | Sim |
| Anônimo ou sessão vencida | Não | Não | Não |
| Contrato encerrado / permissão revogada / Portal indisponível | Não | Não | Não |
| Empresa divergente / ID da aula de outro tenant | Não | Não | Não |
| Curso ou aula em rascunho | Não | Não | Apenas operador autorizado |

**Somente referência funcional:** a tabela não representa testes integrados executados.

## Gates
- [x] Contrato tipado de verificação e implementação padrão deny-all;
- [x] Validação defensiva de permissão, escopo e expiração em domínio;
- [x] Rascunho de testes de autorização;
- [x] Prévia de edição e publicação com dados fictícios locais;
- [ ] Testar PHP/PHPUnit e executar análise estática de segurança em ambiente homologado;
- [ ] Contrato oficial Portal, provedor verificável, sessão segura e testes de revogação;
- [ ] CRUD real de cursos/aulas e persistência do progresso em PostgreSQL, com transações;
- [ ] Revisão independente de LGPD, tenant isolation, backup/rollback e auditoria;
- [ ] Homologação de UI/UX e publicação com autorização expressa.

**Restrições:** não publicar as prévias na VPS/Internet; não colocar preview sob o docroot público; routes/web.php mantém fallback 404. Nenhum deploy, merge, mudança na main, credencial ou gasto adicional foi realizado.
