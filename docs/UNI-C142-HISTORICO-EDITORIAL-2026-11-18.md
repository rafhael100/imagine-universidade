# UNI-C142 — Consulta confiável do histórico editorial

**Data:** 18/11/2026. **Base de desenvolvimento:** `92d8452b5cb3e65308a11044747f75d6c77e9cd5`.

## Necessidade e evidência

O histórico editorial existente registra operações manuais de cadastro, edição, ordenação, publicação, retirada e exclusão. Esta entrega corrige sua consulta, sem atribuir a esses eventos revisão humana ou intervenção de IA.

A capacidade continua vinculada à manutenção de evidências de `BASE-UNI-01-04` e à rastreabilidade editorial da base funcional. Não acrescenta um indicador de desempenho individual ou um novo tipo de evento.

Dois defeitos foram identificados no código anterior:

1. `adminAudit()` limitava `before_id` a `2147483647`, embora a tabela use identificador bigint, o repositório devolva o ID real da última linha e a interface aceite inteiros seguros positivos. Uma página cujo cursor fosse `2147483648` oferecia continuação que o próprio endpoint rejeitava com 422.
2. `refreshAudit()` convertia `200 {}` ou `events:null` em uma lista vazia. A tela então afirmava “Nenhuma alteração editorial registrada.” sem ter recebido uma página válida. Também anexava eventos e cursores sem conferir sua coerência.

A evidência inicial é a leitura desses caminhos. Os cenários Node abaixo exercitam a implementação atual; PHP, PostgreSQL e Chromium não foram executados localmente.

## Contrato HTTP preservado

Permanece `GET /universidade/private/admin/audit?before_id=N`, com a mesma rota, middleware, escopo editorial e DTO:

```json
{
  "events": [
    {
      "id": 2147483700,
      "action": "course.updated",
      "resource_kind": "course",
      "resource_id": 12,
      "authority_revision": 1,
      "occurred_at": "2026-11-18 10:00:00+00"
    }
  ],
  "next_before_id": null
}
```

A única alteração de produção no controller é o máximo de `before_id`: **9007199254740991**, o maior inteiro seguro positivo do JavaScript. Permanecem as regras Laravel `sometimes`, `integer` e `min:1`, inclusive os formatos de entrada já aceitos. Não foi substituída a validação por um parser decimal novo.

O cursor continua sendo um limite exclusivo (`id < before_id`), sem exigir a existência de uma linha âncora. O repositório continua ordenando por ID decrescente, lendo 51 e devolvendo no máximo 50 eventos. A identidade do operador e a organização não são adicionadas à resposta. A leitura não grava dados.

Também se preserva o comportamento legado de um grant MANAGE de outra empresa: o repositório não consulta os eventos editoriais e devolve a lista vazia. A ampliação numérica não concede permissão ou muda esse resultado. Ausência de permissão e mudança da autoridade durante a leitura continuam sob os guards existentes.

## Validação e estados da interface

`validatedEditorialAuditPage()` valida a página inteira antes de alterar a lista visível:

- O envelope deve ser um objeto com `events` como array de até 50 elementos e `next_before_id` explícito.
- Cada evento deve ter ID e referência do recurso inteiros seguros positivos, ação textual não vazia de até 48 caracteres, tipo de recurso textual não vazio de até 24 e data válida.
- Os IDs devem ser únicos e estritamente decrescentes. Em continuação, todos ficam abaixo do cursor enviado e não repetem os eventos já carregados.
- O próximo cursor é `null` ou o ID do último evento de uma página completa de 50 elementos. Não há arredondamento, truncamento ou cursor inferido de uma página incompleta.
- Somente `id`, `action`, `resource_kind`, `resource_id` e `occurred_at` são copiados para o estado da interface. Campos adicionais, inclusive um eventual identificador de operador, não são exibidos. `authority_revision` permanece no DTO do servidor e não passa a ser apresentado na tela.

As datas nativas são preservadas como texto. A validação aceita o formato SQL com espaço ou o formato ISO com `T`, segundos, fração opcional de até seis casas e fuso ausente, `Z`, `+00`, `+0000` ou `+00:00`. Confere calendário e componentes de horário; não converte a hora nem atribui um fuso a uma data que não o informou. O horário completo recebido é apresentado por `textContent`.

O histórico distingue carregamento, página válida, vazio válido e indisponibilidade. Uma falha HTTP, JSON inválido, envelope incompleto ou evento inválido limpa a lista e seu cursor e mostra uma orientação local para atualizar manualmente. Nenhum desses casos afirma que não existem registros. Somente `events:[]` com `next_before_id:null` válido permite a mensagem de histórico vazio.

Uma continuação inválida não anexa parte da página; a recuperação começa por um clique em **Atualizar histórico**, sem repetição automática da consulta. A paginação manual já existente continua acumulando páginas válidas, sem consulta antecipada de páginas seguintes.

Há uma única leitura pendente por vez. Os dois controles ficam desabilitados durante a consulta e os handlers recusam gestos repetidos ou um cursor que já não corresponda ao estado atual. Os guards de geração impedem aplicação e liberação de controles por uma resposta antiga. Em 403 ou 419, a revogação existente limpa eventos, cursor e mensagem local e mantém os controles desabilitados; uma resposta tardia não restaura esses dados.

## Preservação do editor

A consulta do histórico não chama `fillCourse`, `fillLesson`, `resetLesson`, confirmação de descarte, prévia, publicação ou qualquer escrita editorial. Os nove campos dos dois formulários, a seleção de curso/aula e a mensagem de trabalho do editor permanecem intactos em consultas, falhas e recuperação do histórico. A revogação continua limpando os campos conforme o comportamento de segurança já existente.

A atualização do histórico também não resolve uma escrita editorial cujo resultado esteja incerto: não altera `writeOutcomeUnknown`, prontidão do catálogo ou a exigência de consulta manual do editor.

Seletores estáveis para integração:

| Elemento | Seletor |
|---|---|
| Painel existente | `#audit-panel` |
| Atualizar primeira página | `#refresh-audit` |
| Carregar página anterior | `#load-more-audit` |
| Estado acessível da consulta | `#audit-status` |
| Lista | `#audit-items` |
| Linha validada | `#audit-items [data-audit-id]` |

## Verificação

### Executado localmente

- `node scripts/check-editorial-audit.mjs`: **27 cenários aprovados**, usando o script completo da view e seus handlers reais. Somente DOM e HTTP são sintéticos. Inclui páginas com IDs acima de int4, datas nativas, allowlist, página incompleta, ordem e cursor inválidos, preservação de rascunhos, ausência de escrita/repetição automática, recuperação manual, leitura pendente, 403/419 e resposta/JSON tardios após revogação.
- `node --check` no checker e no módulo Chromium: aprovado.
- `git diff --check`: aprovado.

O checker principal foi executado e parou no assert estático anterior que exigia literalmente `el("strong",String(item.action||"alteração"))`. O novo renderer usa `el("strong",item.action)` após validar a página, mantendo `textContent`. Essa adaptação mecânica e a importação do focal pertencem à integração do root; não se declara a suíte principal integralmente aprovada neste worktree.

### Preparado para CI, ainda não executado nesta entrega

- `tests/Feature/EditorialAuditPaginationFlowTest.php`: **7 cenários HTTP reais**, com migrations e SQLite descartável, cobrindo 50+1 IDs acima de int4, cursor seguro máximo/exclusivo/sem âncora, formatos legados, rejeição antes da consulta, escopo, ausência de mutação e revalidação por revogação ou revisão da autoridade.
- `scripts/qa-browser-editorial-audit.cjs`: **16 verificações Chromium** em contexto e fixtures próprios. Exercita a página real, paginação grande, rascunhos, recuperação, respostas inválidas, datas/texto literal, viewport de 320 px, leitura pendente e 403/419. O módulo não inicia navegador ou servidor; é chamado pelo runner autorizado. Esperas de início de uma resposta suspensa, encerramento de páginas e contexto têm limite de oito segundos; o `finally` libera a resposta pendente antes do encerramento.

Não houve execução local de PHP, PostgreSQL, Docker ou Chromium. Não foram alterados schema, grants, bindings Portal, retenção, release gates ou scripts de implantação. Não houve stage, commit, push ou deploy por esta entrega.

## Integração C141–C143

O coordenador integrou o checker e o módulo nos runners existentes e ajustou o assert estático para o renderer textual validado. A primeira execução integrada encontrou quatro expectativas antigas de que `refreshAudit()` rejeitasse a promise em uma revogação; a C142 agora trata o erro localmente. Nos checkers de filtros de cursos, filtros de aulas e recibos editoriais, somente essas quatro expectativas passaram para `assert.doesNotReject`. Permaneceram intactos os asserts de `accessDenied`, limpeza, controles desabilitados, respostas tardias e quantidade de requisições/escritas. Uma revisão independente confirmou a adaptação.

A suíte Node principal completa passou na combinação C141/C142/C143, incluindo os 27 cenários focais de auditoria, os 61/79 de favoritos e os 13 de preservação de rascunhos. Sintaxe dos módulos, diff e cerca dos 15 caminhos de escrita também passaram. Os sete Feature e os cenários de navegador novos aguardam a CI do SHA integrado; o percurso Laravel real existente permanece com respostas de negócio reais.

## Evidência do SHA integrado

A execução [Actions 44237563589](https://github.com/rafhael100/imagine-universidade/actions/runs/44237563589), no SHA `b29f06e8a71f68d8d10129e88a8b66f8ce7fe6ad`, concluiu os seis jobs com sucesso. O log registra **391 testes PHP / 5.128 asserções** (39 Unit/169 e 352 Feature/4.959), **804 verificações Chromium sintéticas** e **245 verificações no Laravel real**, seguidas da conferência de persistência aprovada. Os sete Feature da C142 e os cenários de navegador preparados nos três recortes foram executados nessa revisão integrada.

Este resultado substitui o estado pendente descrito na preparação acima. Não houve execução de PHP ou navegador local; a CI usou identidades e bancos descartáveis. A PR permanece em rascunho, sem merge ou implantação, e os 13 release gates continuam `HOLD_NO_GO`/`NOT_VERIFIED`.
