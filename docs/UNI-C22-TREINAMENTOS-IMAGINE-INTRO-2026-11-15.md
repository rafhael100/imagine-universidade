# UNI C-22 — primeira trilha Treinamentos Imagine

**15/11/2026 · conteúdo editorial em rascunho · DRAFT / NO-MERGE / NO-DEPLOY.**

## Escopo

O manifesto `content/mvp-cursos-v1.json` tinha três cursos e oito aulas, mas nenhuma aula na categoria **sistemas**, que estava visível no menu da Universidade. Este avanço adiciona **um quarto curso e três aulas introdutórias**, completando um total de **quatro cursos e onze aulas**, distribuídos nas três áreas da Universidade:

- **Nossa Metodologia:** Visitas → Leads → Clientes (4 aulas).
- **Negócios:** presença digital (2) e organização de contatos (2).
- **Treinamentos Imagine:** primeiros passos com os serviços Imagine (3).

## Conteúdo novo

**Primeiros passos com os serviços Imagine** é uma trilha introdutória com três aulas:
1. Portal do Cliente: o ponto de acompanhamento.
2. Sites Imagine e CRM: da visita ao lead.
3. Performance AI: objetivos e acompanhamento responsável.

Os textos evitam promessas de resultados, não exigem dados pessoais e distinguem funcionalidades previstas de módulos **ainda em desenvolvimento**, sem instruções sobre telas ou botões que não foram homologados. Retêm o foco comum nos pilares Visitas, Leads e Clientes.

## Segurança de publicação e testes

- Mantido `status=editorial_draft`, `audience=authorized_imagine_clients_only` e a publicação **desligada** no importador.
- O comando `university:load-synthetic-editorial --confirm-synthetic` continua permitido apenas em `APP_ENV=testing`. A primeira importação prepara 4 cursos/11 aulas; a segunda preserva 4 cursos e não duplica aulas.
- Atualizados os testes PHPUnit e verificações PostgreSQL do GitHub Actions/Docker para os novos quantitativos, a categoria `sistemas` e os avisos sobre o Performance AI em desenvolvimento.
- Não foi adicionada venda avulsa, login real, certificação, prova ou funcionalidade operacional dos sistemas Imagine.

A CI com PHP8.3, PHPUnit, Node e PostgreSQL18 deve ser executada antes de aprovação. O Portal permanece com autoridade real **deny-all** e sem fonte oficial de serviços ativos elegíveis.

**Nenhuma alteração da main, deploy ou gasto extra.**
