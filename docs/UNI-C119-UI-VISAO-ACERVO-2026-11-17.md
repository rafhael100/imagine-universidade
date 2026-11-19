# UNI C-119 — visão do acervo no editor

## Resultado

A interface administrativa apresenta uma **Visão do acervo** acima dos formulários editoriais. Quatro cartões mostram cursos, publicados, rascunhos e aulas atuais; a tabela detalha os mesmos valores nas categorias Metodologia, Negócios e Sistemas Imagine, incluindo categorias zeradas. Dois avisos informam quantos cursos não têm aula na versão mais recente ou descrição curta.

O painel descreve os dados salvos do acervo editorial Imagine. Não apresenta pessoas, empresas clientes, progresso, aprendizagem, desempenho ou ranking. Seus avisos não representam aprovação editorial e não modificam o diagnóstico nem a confirmação de publicação.

O layout usa o painel e as cores existentes, quatro cartões compactos em telas largas e duas colunas em telas estreitas. A tabela tem cabeçalhos de coluna e linha, legenda própria e quebra de texto para preservar números completos. O status da consulta usa `role="status"` e `aria-live="polite"`.

## Contrato consumido

Consulta exclusivamente `GET /universidade/private/admin/overview`, sob o mesmo acesso `MANAGE` editorial dos demais recursos administrativos.

```json
{
  "schema_version": 1,
  "scope": "current_editorial_catalog",
  "totals": {
    "courses": 0,
    "published_courses": 0,
    "draft_courses": 0,
    "current_lessons": 0,
    "courses_without_lessons": 0,
    "courses_without_summary": 0
  },
  "categories": [
    {
      "category": "metodologia",
      "courses": 0,
      "published_courses": 0,
      "draft_courses": 0,
      "current_lessons": 0
    },
    {
      "category": "negocios",
      "courses": 0,
      "published_courses": 0,
      "draft_courses": 0,
      "current_lessons": 0
    },
    {
      "category": "sistemas",
      "courses": 0,
      "published_courses": 0,
      "draft_courses": 0,
      "current_lessons": 0
    }
  ]
}
```

O normalizador da view exige a versão e o escopo exatos, as três categorias na ordem definida e todos os contadores como inteiros não negativos seguros para JavaScript. Exige também a igualdade entre totais e soma das categorias, `published_courses + draft_courses = courses`, avisos limitados à quantidade de cursos e coerência mínima entre cursos com aulas e aulas atuais. Não impõe um corte artificial de 5.000 aos agregados, não arredonda e não trunca contadores.

Somente os campos documentados passam ao estado da interface. Números ausentes, textuais, negativos, fracionários, acima do limite seguro ou inconsistentes tornam a consulta indisponível. Uma resposta válida com zeros mostra explicitamente que não existem cursos cadastrados.

## Consulta e convivência com o editor

A primeira consulta automática começa somente depois de uma carga válida do catálogo editorial. Uma falha nessa preparação não consulta o overview. Depois da primeira tentativa, novas consultas exigem o botão **Atualizar visão**: não há polling, repetição automática após erro nem atualização automática depois de mutações.

O GET possui controle de uma requisição por vez. Enquanto está pendente, apenas seu botão fica indisponível; cursos e aulas continuam utilizáveis conforme os controles editoriais existentes. Erro HTTP 503, falha de transporte ou corpo inválido limpa os números e oferece uma nova tentativa manual, sem transformar indisponibilidade em acervo vazio.

Consultar o painel não chama `fillCourse`, `fillLesson`, `resetLesson`, o diagnóstico de publicação nem confirmações de descarte. Campos não salvos, curso e aula selecionados e mensagens independentes do editor são preservados. O painel informa expressamente que os números dizem respeito ao acervo salvo.

## Invalidação e revogação

O início de qualquer escrita editorial invalida o snapshot antes do envio da mutação. Isso abrange criar, atualizar ou excluir curso; criar, atualizar ou excluir aula; publicar; e retirar do ar. A atualização do catálogo também invalida a visão. Uma confirmação cancelada, um formulário inválido ou o bloqueio por aula irmã não salva não iniciam escrita nem invalidam um snapshot ainda válido.

A invalidação incrementa uma geração, limpa os cartões e a tabela e indica a necessidade de atualizar. Se um GET antigo terminar depois da escrita, da consulta do catálogo ou até depois de uma resposta JSON demorada, sua geração já não permite renderização. A requisição antiga continua ocupando o controle de uma consulta por vez até terminar; a interface não abre uma segunda consulta concorrente para contorná-la.

Uma escrita de resultado desconhecido mantém o congelamento editorial existente. A visão do acervo fica indisponível até a reconciliação explícita do catálogo; não serve como confirmação de que a mutação aconteceu e nunca repete `POST`, `PATCH` ou `DELETE`. Campos não salvos seguem as regras de preservação de C-113.

HTTP 403/419 usa `lockAccess` existente, apaga conteúdo editorial protegido e limpa o snapshot, o status e os dados renderizados do painel. O botão permanece desabilitado. Uma resposta antiga de sucesso não consegue restaurar os números nem os formulários depois da revogação.

## Evidência de implementação

`scripts/check-editorial-overview.mjs` executa o script administrativo real, inclusive handlers registrados, substituindo apenas DOM, confirmação e HTTP. As chamadas automáticas de inicialização são retiradas do harness para permitir controlar sua ordem; as próprias funções de inicialização continuam sendo testadas.

**61 cenários Node executados com sucesso** nesta entrega. Incluem validação e minimização dos agregados, zero legítimo, contadores grandes sem truncamento, preparação do catálogo, falhas independentes, preservação dos dois formulários, oito mutações com GET tardio, cancelamento, escrita incerta, resposta JSON tardia e revogação. Os verificadores existentes de preservação editorial (11 cenários) e diagnóstico de publicação (35 cenários) também passaram.

`scripts/qa-browser-editorial-overview.cjs` acrescenta **36 verificações Chromium previstas** ao laboratório sintético já protegido. Usa o HTML/JavaScript real e fixtures mutáveis isoladas por página para catálogo, aulas, diagnóstico, auditoria e overview; não altera o servidor compartilhado nem chama serviços reais. Cobre cartões e tabela em 320/1440 px, formulários sujos, erros, recuperação, vazio legítimo, todas as oito mutações, exclusão cancelada, escrita incerta, revogação e respostas antigas.

As esperas de requisição retida têm prazo próprio de oito segundos. Erros do módulo são registrados antes da limpeza do contexto, com nome do cenário e primeira linha resumida, para que uma eventual demora na limpeza não esconda a causa original.

O módulo Chromium recebeu apenas verificação sintática local; sua execução pertence à CI sintética. Esta documentação não declara homologação humana, liberação do Portal/SSO, aceite de produção, migração ou implantação.

## Arquivos desta parte

- `resources/views/university/admin.blade.php`
- `scripts/check-editorial-overview.mjs`
- `scripts/qa-browser-editorial-overview.cjs`
- Este documento.

A implementação e as verificações do endpoint ficam documentadas separadamente na entrega backend de C-119. O integrador conecta os dois módulos aos runners existentes e adiciona a fixture base de overview ao servidor sintético compartilhado.
