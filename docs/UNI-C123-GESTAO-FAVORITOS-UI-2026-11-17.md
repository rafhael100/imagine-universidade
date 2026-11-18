# UNI-C123 — Gerenciamento dos favoritos guardados na interface do aluno

Data de referência: 17/11/2026, considerando o contexto do usuário em America/Sao_Paulo.

## Resultado

A biblioteca ganhou o painel recolhível **Gerenciar favoritos**, junto dos controles de favoritos existentes. O aluno pode consultar suas referências guardadas, inclusive as de cursos retirados, e remover uma referência por ação explícita. A consulta começa somente pelo botão **Consultar favoritos guardados**. Abrir o painel não faz uma requisição.

Cada linha mostra o slug do curso, a data original do favorito e a disponibilidade informada pela API. Uma referência indisponível não mostra título, conteúdo ou link para o curso, mesmo quando o catálogo já carregado ainda contém esse curso. Para uma referência disponível, a interface pode complementar a linha com **Título no catálogo atual**, somente se ID e slug coincidirem com o catálogo autorizado.

A consulta e a remoção preservam o curso, a aula, a busca, a categoria e o filtro de favoritos selecionados. A lista retida não substitui a lista completa de favoritos disponíveis, não altera conclusão de aulas e não depende da exportação individual.

## Contrato consumido

O painel usa `GET /universidade/private/favorites/retained`, com `after_course_id` somente para a página seguinte:

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "favorites": [
    {
      "course_id": 70,
      "course_slug": "curso-70",
      "saved_at": "2026-11-17T12:34:56Z",
      "availability": "unavailable"
    }
  ],
  "next_after_course_id": null
}
```

O normalizador aceita exclusivamente o esquema e o escopo documentados. Cada ID precisa ser inteiro positivo seguro, cada slug deve respeitar o padrão editorial ASCII de até 120 caracteres e cada data deve ser UTC canônica com segundos e calendário válido. Disponibilidade admite apenas `available` ou `unavailable`.

Uma página contém até 50 referências em ordem crescente de ID. O cursor não nulo exige uma página de 50 itens e deve corresponder ao último ID recebido. A página seguinte precisa avançar além do cursor e não repetir IDs ou slugs já acumulados. Campos adicionais, inclusive identidade, título e conteúdo, são descartados por uma lista explícita de campos permitidos.

Os itens já consultados são acumulados somente após uma nova ação **Ver mais favoritos**. Não existe busca automática de todas as páginas nem limite artificial que corte silenciosamente uma coleção. A quantidade exibida corresponde às referências consultadas, sem afirmar o total que ainda não foi consultado.

O cursor do servidor é um limite inferior. Se o aluno remover a última linha da página, a interface conserva esse cursor para alcançar os itens seguintes. Não exige que a linha usada como limite continue existindo.

## Remoção e confirmação

O botão de uma linha usa o `DELETE /universidade/private/courses/{courseId}/favorite` já existente. A linha permanece visível enquanto a requisição está pendente. Somente o recibo com o mesmo `course_id` e `favorite: false` confirma a remoção.

Após esse recibo, a interface remove apenas a linha correspondente e esse ID do cache de favoritos já conhecido. O restante do cache permanece intacto. Uma página retida nunca autoriza `favoritesReady` nem substitui `favoriteIds`, porque a página pode ser parcial e conter cursos indisponíveis.

O painel compartilha a exclusão mútua de escrita com o botão de favorito do curso. Um token identifica o dono da operação; um `finally` antigo não pode liberar uma operação mais nova. O DELETE também permanece bloqueado enquanto uma leitura de reconciliação do botão de favorito estiver pendente.

## Resultado não confirmado

Uma falha de rede, erro HTTP ou recibo inválido de remoção pode ocorrer depois de o servidor efetivar a alteração. Nessa situação:

1. O painel limpa suas linhas e o cursor, registra que a remoção anterior não foi confirmada e bloqueia outra escrita até uma consulta manual válida.
2. Não repete o DELETE nem chama automaticamente uma API para reconciliá-lo.
3. O `GET /favorites` existente pode atualizar sua própria lista do catálogo, mas não remove essa guarda nem confirma a remoção de um favorito indisponível.
4. Uma consulta retida manual válida permite uma nova ação explícita sobre uma linha presente. O aviso de que o resultado anterior não foi confirmado permanece.
5. Uma página vazia, inclusive a primeira, é apresentada como o resultado dessa consulta. Não é tratada como prova de que o DELETE anterior ocorreu.

Essa distinção evita inferir a ausência de uma referência a partir de uma lista que pode estar limitada ao catálogo atual ou a uma página.

## Concorrência, atualização e revogação

O estado do painel é independente e tem uma geração própria de leitura. Atualização da biblioteca, consulta da lista de favoritos disponíveis e qualquer escrita de favorito invalidam respostas retidas anteriores. A conclusão de uma requisição antiga não pode reconstruir linhas descartadas nem encerrar o carregamento de uma consulta nova.

A navegação entre cursos e aulas permanece compatível com a intenção global de remover a referência escolhida. Já uma atualização da biblioteca durante uma remoção invalida o contexto da resposta: a interface mantém o resultado como não confirmado e exige nova consulta manual.

Respostas 403 e 419 usam o encerramento de acesso existente. O painel é fechado e ocultado; linhas, cursor, status e aviso de incerteza são apagados; os botões são desabilitados. Uma resposta tardia, inclusive depois da leitura de JSON ter começado, não restaura os dados.

Uma consulta 503 ou malformada mostra indisponibilidade e permite tentar novamente. Não se transforma em uma lista vazia válida e não impede o estudo dos materiais já autorizados.

## Arquivos e seletores

Implementação: `resources/views/university/student.blade.php`.

Teste de funções e handlers reais: `scripts/check-retained-favorites.mjs`.

Módulo de navegador: `scripts/qa-browser-retained-favorites.cjs`.

| Elemento | Seletor |
| --- | --- |
| Painel recolhível | `#retained-favorites-panel` |
| Consulta manual | `#reload-retained-favorites` |
| Lista | `#retained-favorites-list` |
| Linha | `[data-retained-course-id]` |
| Disponibilidade da linha | `data-retained-availability` |
| Remoção | `[data-remove-retained-favorite]` |
| Status | `#retained-favorites-status` |
| Próxima página | `#more-retained-favorites` |
| Data canônica | `time[datetime]` dentro da linha |

As alterações nos checkers C112, C116 e C118 apenas incluem as novas dependências reais de renderização/encerramento e o estado necessário nos seus ambientes sintéticos. Suas asserções existentes foram preservadas. O runner e as integrações principais são coordenados separadamente.

## Verificação realizada e preparada

Foram executados localmente, sem servidor ou navegador:

- **73 cenários Node** do C123, usando o script completo da view e seus handlers reais.
- **50 cenários de favoritos C116**, **53 de exportação C118**, **40 de ajuda C112** e **59 de posição de leitura C121**, todos aprovados após as adaptações mecânicas.
- `node --check scripts/qa-browser-retained-favorites.cjs`.
- `git diff --check`.

O checker focal cobre campos permitidos, tipos, calendário, ordem, duplicação, paginação após remover o cursor, consulta manual, privacidade do título, preservação de estudo, recibo exato, ausência de otimismo, remoção ambígua, isolamento da guarda perante GET `/favorites`, respostas antigas e 403/419. Também cobre o caso em que uma reconciliação antiga termina depois de outra escrita já ter começado.

O módulo Chromium prepara **37 verificações**, com contexto isolado e fixtures por página. Ele cobre o fluxo visível, páginas de 50, último cursor removido, respostas malformadas, falha versus vazio, remoção incerta, escrita compartilhada, navegação e revogação. Esperas por respostas controladas e limpeza têm prazo, e a etapa corrente é registrada antes da limpeza se houver falha.

O módulo não foi executado localmente. A execução do navegador sintético e do percurso com Laravel/banco reais fica para a CI; este documento não atribui aprovação de CI ao novo painel antes desse resultado.

## Limites preservados

Esta entrega usa as referências que o backend mantém dentro da política vigente. Não muda retenção, fonte de elegibilidade ou autoridade de acesso, nem inicia um prazo a partir de `saved_at`. Não cria restauração de conteúdo retirado, remoção de progresso ou exportação adicional. A disponibilidade da referência não representa aprovação humana, aprendizado medido ou autorização para ler conteúdo indisponível.
