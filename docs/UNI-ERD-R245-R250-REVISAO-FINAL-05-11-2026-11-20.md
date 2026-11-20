# UNI ERD-R245–R250 — revisão textual das seis aulas restantes (5–8 e 10–11)

**20/11/2026 — proposta DRAFT, não homologação pedagógica.** Base PR #148 `29fe3ce8df12641efb4d87d2a4b657ac357ab51c`. Esta PR altera exclusivamente os corpos das aulas **5, 6, 7, 8, 10 e 11**, um documento e o gatilho da QA reaproveitada.

## Revisões textuais exatas

- **R245 — Aula 5:** informação essencial da página, acessibilidade textual, depoimentos e regras específicas de profissões reguladas.
- **R246 — Aula 6:** Onepage versus Landing Page, sem atribuir conversão ou integração garantida ao formato.
- **R247 — Aula 7:** oportunidade, proposta, contratação e perda em colunas distintas; casos fictícios de duplicidade.
- **R248 — Aula 8:** resposta contextual e limite de contato/automação; respeito ao pedido de não contato.
- **R249 — Aula 10:** Site → contato → CRM condicionado a integração e permissões realmente homologadas; não transformar uma demonstração em funcionalidade real.
- **R250 — Aula 11:** campanha e Performance AI como hipótese; R$ 600 fictícios não são preço Imagine nem autorização de gastos; cliques ≠ leads ≠ contratos.

Cada aula mantém introdução, **EXEMPLO FICTÍCIO**, **APLICAÇÃO OPCIONAL** e **CUIDADO IMPORTANTE**. Nenhum exercício exige envio, tutoria IA, prova, nota, dado real, senha, cartão ou conta; não há coleta. IDs, títulos, ordem, dez cursos e 35 aulas preservados.

## Cobertura dos textos no encadeamento DRAFT

As PRs **#141, #142, #143, #144, #145, #146, #147, #148 e esta PR** apresentam propostas de revisão textual para **todas as 35 aulas**. Isso significa que o conteúdo foi proposto e passou/aguarda verificações técnicas — **não** que um pedagogo autenticado aceitou as aulas. A rubrica existente continua com **35 `PENDING_HUMAN_REVIEW`, 210 critérios, 0 aceites humanos**, sem nova ferramenta nem mudança do mecanismo de aprovação.

## Rubrica já existente: critérios desta revisão

| Critério | Evidência para leitura e aceite humano posterior |
| --- | --- |
| Precisão factual | Etapas do funil sem equivalência indevida; resultados de campanha não prometidos |
| Clareza | Escolha do formato do site e mensagem de retorno explicadas para iniciantes |
| Exemplos fictícios | Clínica, manutenção, gráfica e campanhas imaginárias |
| Aplicação opcional | Atividades em papel, sem contas ou sistemas reais |
| Cuidados | Regulação profissional, dados mínimos, encerramento de contato e acessibilidade |
| Produto Imagine | Sem funcionalidades Sites–CRM–Performance não homologadas ou campanhas reais |

## QA verificável

O workflow existente `.github/workflows/uni-editorial-successors.yml` reconhece a branch em `push`; confere checkout de `GITHUB_SHA`, não ter arquivos `.env`, e reaproveita testes do piloto 4/9/32 mais 21 verificações integradas (incluem 4 PHP Portal fail-closed e 13 gates). Antes de declarar sucesso verificar conclusão e commit da **HEAD final**. Não executados: avaliação humana pedagógica, teste manual com leitor de tela, fonte comercial verdadeira e implantação.

**Correção de regressão previamente reproduzida:** a PR #148 alterou texto da aula 1 e um teste negativo legado buscava uma frase literal antiga. O teste foi corrigido para mutar trecho derivado do texto canônico atual (sem relaxar o verificador byte a byte), em `scripts/check-editorial-fulltext-html.mjs`, e exige execução da CI na SHA corrigida. Não refazer esse teste nesta PR.

## Acesso e gates independentes

A [issue Portal #886](https://github.com/rafhael100/imagine-portal/issues/886) continua sem proprietário oficialmente nomeado da fonte de serviços/contratos ativos elegíveis, política SKU homologada, cobertura atual e revogação independente do último serviço. Prévia, snapshot de implantação, ledger candidato, webhook ou simulação não são prova de elegibilidade. A Universidade mantém `UnavailablePortalAuthority` e `mayIssuePortalGrant=false`, decisão `HOLD_NO_GO` e 13/13 `NOT_VERIFIED`.

**Próximas ações independentes:** conteúdo → revisão pedagógica humana autenticada dos 210 critérios das 35 aulas e eventuais ajustes, sem aprovação automática; acesso → owner comercial/técnico e evidências auditáveis Portal #886 de estado vigente, SKU, identidade empresarial e revogação do último serviço antes de integração real. Nada de merge, alteração de main, deploy, VPS, DNS, SSO, grants, gastos ou dados reais.
