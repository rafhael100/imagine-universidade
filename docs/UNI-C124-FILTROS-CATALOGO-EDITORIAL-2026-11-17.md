# C-124 — busca e filtros do catálogo editorial

17/11/2026 · Implementação candidata em revisão. **HOLD_NO_GO** operacional.

## Capacidade e fontes

O editor pode encontrar cursos no catálogo administrativo autorizado por texto,
categoria e situação de publicação. A entrega complementa as capacidades de
organização e navegação do acervo em
[UNI-01](10-modulos/UNI-01.md) e [UNI-03](10-modulos/UNI-03.md).

O filtro é local à página e usa somente o catálogo administrativo já recebido e
validado. Não acrescenta endpoint, parâmetro de pesquisa ao servidor, histórico
de pesquisa, armazenamento no navegador ou acesso a conteúdo de outra empresa.
Nenhuma busca automática em corpos de aulas ou versões arquivadas foi criada.

## Comportamento

| Controle | Critério |
|---|---|
| Buscar curso | Texto literal contido no título, slug, descrição ou nome da categoria; até 120 caracteres de entrada |
| Categoria | Todas, Metodologia, Negócios ou Sistemas Imagine |
| Publicação | Todos, Publicados ou Rascunhos |
| Limpar filtros | Limpa os três controles e mantém a edição atual |

Os critérios são combinados. A busca ignora maiúsculas/minúsculas e acentos,
preserva a ordem original do catálogo e não interpreta o texto como expressão
regular ou HTML. Espaços externos não alteram o termo pesquisado.

Publicado/rascunho corresponde ao estado salvo do curso no catálogo atual.
O painel não infere aprovação humana, quantidade de versões históricas ou
prontidão para publicação a partir desses rótulos.

A contagem informa quantos cursos correspondem aos critérios em relação ao
catálogo recebido. Quando nenhum curso corresponde, a interface informa zero
resultados. Um catálogo válido sem cursos mantém a mensagem de acervo vazio;
falha de consulta apresenta indisponibilidade e controles desabilitados.

## Preservação da edição

Se o curso selecionado não corresponder aos filtros, ele continua visível com
o rótulo **Em edição · fora do filtro**. Essa linha não aumenta a contagem dos
resultados. Sua informação vem da lista validada, e não de campos não salvos.
Não há duplicação quando o curso selecionado também corresponde aos critérios.

Filtrar ou limpar filtros redesenha somente a navegação. Não seleciona outro
curso, não preenche formulários, não troca a aula atual, não invalida a
conferência de publicação e não altera uma consulta histórica aberta. Os
rascunhos de curso e aula continuam intactos, sem diálogo de descarte.

Ao clicar de fato em outro curso ou em **+ Novo**, permanecem os controles
existentes de descarte explícito e autorização. Cancelar o diálogo preserva a
seleção, os campos e os filtros. O novo curso ainda não salvo não aparece como
registro persistido na navegação.

Uma gravação pode mudar título, categoria ou publicação de um curso. Depois da
consulta autorizada do novo catálogo, os filtros vigentes são reaplicados sobre
os dados salvos; o curso em edição permanece visível mesmo que deixe de
corresponder aos critérios. O filtro não determina se uma operação editorial
é permitida.

## Acesso, concorrência e interface

Os controles ficam indisponíveis antes de um catálogo válido, durante escrita,
após resultado de escrita não confirmado e depois da revogação. Os handlers
conferem essas condições também quando um evento é disparado por script.
A atualização do catálogo mantém as mesmas barreiras de leitura já existentes.

Na revogação, o texto de busca, seleções dos filtros e contagem são apagados ou
restaurados aos valores neutros, junto da limpeza do conteúdo privado. Não há
recuperação automática de filtros de outra sessão.

Cada campo tem rótulo explícito, a contagem usa uma região de status e as ações
preservam os alvos de toque e foco do design Imagine. Busca, seletores e textos
longos permanecem dentro do painel em telas estreitas.

## Verificação

O checker focal passou em **15 cenários** com o script e os handlers reais e DOM/HTTP controlados,
sem iniciar serviço, browser ou banco local. O módulo Chromium usa um contexto
próprio com catálogo fictício, sem alterar as fixtures compartilhadas do runner.
A execução de suas **19 verificações Chromium** permanece restrita à CI
descartável; a sintaxe foi verificada, sem executar navegador local.

O percurso real acrescenta filtros combinados durante a edição de dois
rascunhos e a consulta de uma aula arquivada. Confere o curso atual fora dos
resultados, ausência de novas requisições e preservação dos campos e leitor
histórico, inclusive depois de limpar os filtros. Capturas do painel em 1440
e 390 pixels complementam a verificação de largura da página.

Os checkers anteriores de escrita e limpeza HTTP receberam somente as novas
dependências de renderização; as asserções originais permanecem. O checker
principal completo passou durante a implementação inicial.

### CI e inspeção visual

O [run 44213874334](https://github.com/rafhael100/imagine-universidade/actions/runs/44213874334),
SHA `fad8c3916a44ca91f843c36d1c9ea26396d0800f`, passou nos **seis jobs**.
Foram **245 testes PHP / 2.801 asserções**, **475 verificações Chromium** e
**119 verificações no percurso Laravel/SQLite real**. As 19 verificações
sintéticas C124 e as duas verificações reais de filtrar/limpar passaram;
a conferência final de persistência também passou. Permaneceram 16 invariantes
de schema e 24 verificações de privilégios.

As capturas reais em 1440 e 390 pixels confirmaram a contagem, a indicação do
curso em edição fora do filtro e a preservação da navegação, sem transbordamento
horizontal. A inspeção encontrou o texto de categoria comprimido no seletor
da coluna desktop estreita. O ajuste seguinte usa quebra de linha flexível:
os dois seletores ficam lado a lado quando há largura e ocupam linhas próprias
quando necessário. Essa correção visual entra na próxima CI, sem atribuir ao
run anterior a validação de CSS alterado posteriormente.

Nenhuma tabela, permissão, escrita HTTP ou binding operacional foi alterado.
Os treze gates, a integração Portal pendente e os limites de publicação e
implantação permanecem vigentes.
