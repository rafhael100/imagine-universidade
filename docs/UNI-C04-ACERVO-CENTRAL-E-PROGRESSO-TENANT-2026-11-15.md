# UNI C-04 — acervo central Imagine com progresso isolado por cliente

**15/11/2026 · Revisão técnica · NO-MERGE / NO-DEPLOY**

## Motivação de produto

Os mesmos cursos serão oferecidos a todos os clientes Imagine elegíveis. O desenho anterior, que guardava os cursos dentro de cada empresa, obrigaria a copiar o currículo e repetir atualizações. Este recorte separa o **editor Imagine** (dono do catálogo compartilhado) da **empresa cliente** (dona apenas do seu progresso individual).

A Universidade continua **benefício de serviços Imagine elegíveis**, sem curso avulso, mensalidade educacional, nota, prova ou certificado.

## Modelo

- **Acervo editorial central:** um registro lógico de organização editorial, chamado provisoriamente `imagine-editorial`, publica cursos com `is_shared=true`.
- **Clientes:** cada empresa autorizada pelo Portal tem sua organização educacional isolada. Todos leem **o mesmo acervo publicado**; não recebem permissões de edição.
- **Progresso:** chave única `(organização_do_cliente, sujeito, aula)`. Aulas e versões são compartilhadas; conclusão e histórico pertencem ao cliente.
- **Administração:** só um grant oficial `university:manage` da organização editorial pode criar, editar e publicar o acervo; possuir um serviço cliente não dá essa permissão.
- **Estudo:** grant `university:view` de cliente elegível, nunca a organização editorial; revogação bloqueia novas leituras e gravações.
- **Rascunhos:** não aparecem para alunos. A atualização de publicação cria novas versões/aulas com IDs diferentes; progressos antigos não são artificialmente transferidos.

A chave `imagine-editorial` e a coluna histórica `synthetic_key` são **placeholders de homologação**. O Portal precisa homologar o modelo real de empresa editorial, sujeito e escopo antes de habilitar o provider.

## Entregas de código

1. Adicionada coluna `educational_courses.is_shared`, padrão falso, e índice por dono/visibilidade/publicação. Sem alteração de registros existentes.
2. Repositório limita acesso a cursos compartilhados **da organização editorial** e separa permissões `view` / `manage` por escopo.
3. Progresso continua gravado na organização do cliente, sem misturar histórico dos demais.
4. Seed editorial explícita `UniversityEditorialDemoSeeder` apenas para ambientes `local` e `testing`; sem concessão de acesso.
5. Manifesto editorial `content/mvp-cursos-v1.json` com **3 cursos e 8 aulas curtas** em rascunho: metodologia Visitas → Leads → Clientes, presença digital e organização de oportunidades.
6. Importador `UniversityMvpContentSeeder` que insere apenas rascunhos, não modifica cursos existentes e é proibido fora de ambientes de teste.
7. Testes PHPUnit/Feature **escritos, ainda não executados**: cliente A e B enxergam o mesmo curso, mas não o progresso um do outro; republicação preserva conclusão anterior com IDs novos; cliente não administra catálogo.

## Procedimento de laboratório FUTURO (não executado)

Executar **somente em sandbox isolada e autorizada**, com PHP/Composer, extensões necessárias, banco efêmero e backups aprovados:

1. Instalar dependências de desenvolvimento e revisar o lockfile.
2. Rodar `php -l` nos arquivos PHP alterados.
3. Executar `vendor/bin/phpunit` com Unit e Feature. A suíte de integração usa SQLite `:memory:`; PostgreSQL precisa de sua própria homologação.
4. Aplicar migrações em banco exclusivamente sintético.
5. Executar as duas seeds **por comando explícito**, apenas local/testing.
6. Validar editorial global, catálogo/visibilidade, empresa A/B, revogação e rollback.

Não há execução automática de migração, seed, container, CI, deploy nem ligação ao Portal real nesta PR.

## Pendências P0 antes de produto utilizável

- Contrato homologado de identidade e elegibilidade com o Portal (<https://github.com/rafhael100/imagine-portal/issues/848>). Sem ele, o provider padrão permanece **deny-all**.
- Provisionamento seguro/idempotente da organização educacional correspondente à empresa cliente autorizada pelo Portal. **Hoje este mapeamento não existe na produção.**
- Teste real de isolamento multiempresa no PostgreSQL, incluindo concorrência, transações, permissões do papel DB e revogação enquanto há sessão.
- Revalidação do conteúdo editorial por pessoa responsável, validação de dados pessoais, acessibilidade, auditoria e modelo de retenção.
- Administração com permissões reais e interface vinculada ao backend; as telas atuais ainda são protótipos offline.
- Homologação de segurança, custo, reversão e gate de publicação.

## Verificação desta rodada

Validação estática do manifesto e do código: 3 cursos, 8 aulas, slugs únicos, modo rascunho, guardas de editor/aluno, `is_shared` fechado por padrão e persistência de progresso por cliente. **Isto não equivale a PHPUnit, teste de migração ou teste HTTP executado.**
