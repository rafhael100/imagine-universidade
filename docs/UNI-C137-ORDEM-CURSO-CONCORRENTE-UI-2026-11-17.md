# C137 — Preservar a ordem do curso durante edição concorrente

Referência: rodada de desenvolvimento de 2026-11-17. Verificações locais realizadas em 2026-11-18.

Base de trabalho: `3894f10715be4d52a9a3d4d946cc9923617e05f5`. Este documento registra o recorte da interface; não presume aprovação da CI da combinação final.

## Falha reproduzida

O formulário de curso enviava `sort_order` em todo PATCH, mesmo quando o editor alterava somente o resumo. Duas sessões podiam, assim, desfazer uma alteração de ordem já confirmada.

Antes de editar a view, a reprodução executou o script inteiro e os handlers reais de `resources/views/university/admin.blade.php` em duas VMs Node, com DOM e HTTP sintéticos compartilhando a mesma fixture de servidor:

1. A sessão A abriu o curso com ordem `0`.
2. A sessão B mudou a ordem para `5`, salvou e recebeu o catálogo atualizado com `5`.
3. A sessão A manteve seu baseline `0` e alterou somente o resumo.
4. Seu PATCH real continha `sort_order: 0`; a fixture passou de `5` para `0`.

O corpo observado foi:

```json
{
  "title": "Curso salvo 1",
  "category": "metodologia",
  "summary": "Resumo editado na sessão antiga.",
  "sort_order": 0
}
```

Essa execução comprova o reenvio indevido pelo formulário. Não executa nem comprova transações ou locks de banco; a implementação e os ensaios backend de C137 são entregues separadamente.

## Regra de envio

O handler de `#course-form` captura uma cópia de `{id, sort_order}` do curso validado, antes de `beginWrite`. A captura fica depois da guarda que exige salvar ou descartar uma aula com alterações pendentes.

O campo de ordem continua usando o `intField` existente. O número lido é comparado com o número do baseline, e não com sua representação textual. Portanto, representações como `0`, `000` e `0.0` não constituem uma mudança de ordem nesse fluxo.

| Operação | Corpo relacionado à ordem | Resultado pretendido |
|---|---|---|
| PATCH com ordem numérica igual ao baseline | Omite `sort_order` e `expected_sort_order` | Salvar título, categoria ou resumo preserva a ordem atual no banco |
| PATCH com alteração numérica explícita | Envia `sort_order` e `expected_sort_order` do baseline | O servidor aceita somente se a ordem atual ainda corresponder ao baseline |
| POST de criação | Mantém o `sort_order` existente, sem campo esperado | Criar o curso conserva o payload anterior |

O slug continua excluído do PATCH. Título e resumo continuam aparados; a categoria segue o controle existente. A cópia do baseline não é substituída depois de awaits.

O contrato backend C137 exige ambos os campos do par como inteiros JSON de `0` a `9999`, inclusive, quando `expected_sort_order` está presente. Divergência sob lock retorna HTTP `409` com `draft_order_changed`; par malformado ou incompleto retorna `422` com `invalid_order`. A revalidação da autoridade pode resultar em `403`. Um PATCH sem ordem conserva a ordem atual; clientes legados que ainda enviam ordem sem expectativa conservam o caminho legado.

Essa proteção cobre **somente a ordem**. Não foi introduzido controle de concorrência geral para título, categoria ou resumo, nem garantia para clientes legados que não enviam a expectativa. O frontend não substitui locks, autorização ou a decisão do servidor.

## Integração pontual com C136

C136 altera o mesmo handler para validar o recibo antes de atualizar o catálogo. Este recorte conserva literalmente seu bloco inline:

- Edição exige `result?.saved === true`.
- Criação exige objeto que não seja array, `id` inteiro seguro positivo e `status === "draft"`.
- Um recibo inválido segue o tratamento de resultado não confirmado e não permite o refresh substituir os campos.

A validação de criação pertence a C136; C137 não muda o POST, sua rota ou seus campos. Foram reproduzidas apenas as validações desse handler, sem copiar as mudanças dos outros seis handlers de C136. Não há helper novo compartilhado.

Na integração, aplicar C136 primeiro e preservar esse bloco ao incorporar a captura do baseline e a montagem condicional do PATCH de C137. Os campos extras de um recibo não definem curso, título ou ordem: o estado após sucesso continua vindo dos GETs autorizados existentes.

## Conflitos, falhas e preservação de estado

O sucesso continua fazendo um PATCH, seguido de `GET /admin/courses` e da leitura das aulas do curso. Não há GET preventivo para atualizar o baseline silenciosamente. A sequência passa pelo `refreshCourses` existente, mantendo a seleção do curso, a aula selecionada e a consulta local C131 quando aplicável.

HTTP 409, resposta perdida, falha de transporte ou recibo inválido entram em `freezeUncertainEditorialWrite`. Os campos literais permanecem visíveis e bloqueados; a consulta de aulas é preservada, e a mensagem existente orienta a não repetir a operação. Não há PATCH automático de reconciliação.

A recuperação manual conserva a confirmação de descarte dos campos. Cancelar não consulta nem grava. Aceitar faz as leituras existentes e substitui o baseline pelo valor confirmado. Somente uma nova ação explícita de salvar envia outra alteração, agora com o baseline recém-lido.

Um destino que já pareça aplicado ainda pode corresponder a uma expectativa antiga: esse caso continua sendo conflito. A UI não transforma a coincidência do número desejado em confirmação de uma gravação anterior.

A guarda da aula irmã continua anterior à escrita do curso: uma aula com mudanças não salvas impede o PATCH e conserva os dois formulários. Em operações permitidas, o buffer limpo da aula não é alterado pelo novo cálculo da ordem. Filtros, prévia, preflight, histórico arquivado e gerações continuam sob os hooks existentes.

O single-flight existente permanece. HTTP 403/419 executa a limpeza de acesso, inclusive campos privados e consulta C131. Um recibo tardio depois da negação não restaura curso ou aula nem inicia refresh.

## Verificação local

`node scripts/check-course-order-patch.mjs` passou **30 cenários**, executando o script inteiro da view e handlers reais, com apenas DOM, HTTP e diálogos sintéticos. O revisor independente também executou os 30 cenários e não encontrou bloqueadores no núcleo.

A cobertura inclui a reprodução com duas sessões, omissão por igualdade numérica, limites `0` e `9999`, par explícito, conflito com destino já aplicado, consulta manual cancelada/aceita, perda de resposta antes da confirmação, recibos malformados, autoridade do GET posterior, POST de criação, guarda da aula irmã, C131, single-flight e revogação imediata ou tardia.

A execução do checker principal nesta base parou em `scripts/check-editorial-overview.mjs`, cuja fixture antiga de criação não informa `status: "draft"`. Essa dependência já está corrigida em C136, junto às fixtures correspondentes de `check-editorial-version-history.mjs` e `qa-browser-editorial-overview.cjs`. Elas não foram duplicadas neste worktree. O checker principal completo deve ser executado novamente após integrar C136 e C137.

## Ensaio Chromium preparado

`scripts/qa-browser-course-order-patch.cjs` exporta a assinatura existente `{browser, base, ensureLocalPage, check, pageErrors}` e prepara **21 checks**. Usa um contexto isolado e rotas por página; as duas páginas de editor compartilham somente a fixture HTTP.

O módulo cobre ordem remota preservada pelo resumo, conflito e campos bloqueados, recuperação manual, respostas perdidas de edição textual e de ordem, recibos C136 inválidos, guarda da aula irmã, single-flight, criação inalterada, 403/419 e sucesso tardio após revogação por outra consulta.

Não usa clique no curso já selecionado como atualização. A recuperação é feita pela consulta manual real, que lê novamente o catálogo. As comparações verificam os métodos, rotas e corpos exatos; não basta observar um status visual de sucesso.

As esperas de início, resposta retida e limpeza têm limite de 8 segundos. Cada gate é liberado pelo cenário e também no `finally`; falhas preservam o nome da etapa antes da limpeza. Não é usado `Response.finished`. O módulo passou `node --check`, mas não foi executado em navegador local.

## Entrega e limites

São quatro arquivos: o trecho de `course-form` na view, o checker focal, o módulo Chromium e este documento. Não foram modificados backend, checker legado, runner principal ou workflow neste worktree.

A integração pode importar `./check-course-order-patch.mjs` no checker principal e chamar `qa-browser-course-order-patch.cjs` pelo runner guardado existente. Não há novo seletor ou dependência de runtime.

O diff passou `git diff --check`. Não houve PHP, PostgreSQL, aplicação, servidor ou navegador local. Não foram feitos stage, commit ou push. Ensaios reais de banco, sessões e auditoria e os resultados finais da CI pertencem à integração, sem resultado presumido aqui.

## Integração preparada e verificada em Node

C136 foi integrada primeiro. A montagem condicional do PATCH e o baseline C137 foram incorporados mantendo seu recibo exato e as validações dos outros seis handlers. As fixtures de criação legadas agora possuem o `status: "draft"` real. A suíte Node principal completa passou, incluindo **30 cenários C137 e 29 C136**, sem retirar asserções. Cerca dos 15 caminhos de escrita, sintaxe dos runners e diff também passaram.

O runner sintético inclui as **21 verificações C137**. O percurso Laravel/SQLite prepara **11 verificações adicionais**, reutilizando as duas sessões editoriais: mudança de ordem explícita, texto com baseline antigo que preserva a ordem atual, conflito 409 sem efeitos em registros/auditoria, conservação da aula e do filtro, recuperação manual cancelada/aceita e nova ação com baseline atualizado. O curso e as aulas são restaurados para a jornada existente.

A atualização do catálogo nesse percurso usa recarga real de página, pois selecionar novamente o mesmo curso não consulta metadados. Não há resposta de negócio simulada nem quarta identidade. A captura `framework-course-order-conflict.png` está prevista. A leitura independente não encontrou bloqueador; os resultados de PHP, PostgreSQL e navegador dependem da execução do próximo SHA.
