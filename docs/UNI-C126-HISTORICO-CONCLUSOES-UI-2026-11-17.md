# UNI-C126 — Consulta privada do histórico de conclusões

Data de referência: 17/11/2026. Implementação candidata para revisão e CI.

## Resultado e escopo

A biblioteca ganhou o painel recolhível **Meu histórico de conclusões**. O
aluno consulta as referências das aulas que marcou como concluídas, inclusive
as de versões que já não estão disponíveis. O painel começa fechado e só
consulta o servidor pelo botão **Consultar histórico**. Abrir o painel não
faz uma requisição.

Esse recorte concretiza a proteção do histórico pessoal e a consulta de
progresso útil previstas em BASE-UNI-07-01 e BASE-UNI-07-06, junto da área
pessoal de BASE-UNI-12-01 da
[base funcional aprovada](08-fechamento-candidato/02-BASE-FUNCIONAL-14-MODULOS.md).
Não cria nota, certificado, avaliação ou medição de aprendizagem.

Cada linha mostra apenas slug do curso, slug da aula, versão, data de conclusão
em UTC e disponibilidade da referência exata. Não mostra título, corpo,
identidade ou ID interno; não oferece link de navegação, restauração ou
exclusão. A consulta preserva o curso e a aula atuais, os filtros, favoritos e
a posição de leitura.

## Contrato consumido

O painel usa `GET /universidade/private/progress/history`. A continuação usa
`before_id` somente depois de uma página validada:

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "completions": [
    {
      "completion_id": 100,
      "course_slug": "curso-referencia",
      "course_version": 1,
      "lesson_slug": "aula-referencia",
      "completed_at": "2026-11-17T12:34:56Z",
      "availability": "unavailable"
    }
  ],
  "next_before_id": null
}
```

O normalizador exige esquema e escopo exatos, array de até 50 itens, IDs e
versões inteiros positivos seguros, slugs editoriais ASCII de até 120
caracteres e data UTC canônica com segundos e calendário válido. A versão não
recebe um teto artificial de negócio. Disponibilidade aceita somente
`available` ou `unavailable`.

Campos adicionais são descartados por uma lista explícita de campos
permitidos. O payload bruto não é usado para montar a interface. IDs de
conclusão repetidos ou referências duplicadas de
`(course_slug, course_version, lesson_slug)` invalidam a resposta inteira,
inclusive entre páginas acumuladas. Os mesmos slugs em versões distintas
são referências diferentes e permanecem no histórico.

A disponibilidade vem do servidor e corresponde à aula e versão exatas da
conclusão. A interface não a infere do catálogo carregado. Republicar o curso
em outra versão não faz a referência antiga aparecer como disponível nem
remapeia seus slugs para a versão atual.

## Paginação e atualização manual

As referências chegam por `completion_id` decrescente. A página seguinte
precisa conter IDs estritamente menores que o cursor e manter a ordem. O
cursor não nulo exige 50 itens e deve ser igual ao último ID dessa página.
Não é necessário que a linha usada como cursor ainda exista no servidor.

**Ver mais conclusões** consulta somente a próxima página. **Atualizar
histórico** reinicia a consulta pelos registros mais recentes. Não há busca
automática de todas as páginas, limite total de 5.000 registros ou corte
silencioso de itens acumulados.

A contagem descreve os registros consultados. A paginação não promete um
snapshot congelado entre requisições: conclusões novas podem ficar antes do
cursor utilizado, e uma atualização manual pode ser necessária para vê-las.
Uma página vazia é apresentada como resultado daquela consulta, sem inferir
o resultado de uma escrita anterior.

## Estado independente e autorização

`state.progressHistory` concentra linhas, cursor, estado de carregamento,
mensagem e geração de leitura. O painel fica disponível depois de um catálogo
autorizado e validado, mesmo quando esse catálogo está legitimamente vazio ou
o serviço separado de favoritos falha.

Uma consulta pendente bloqueia outra consulta do próprio painel. Ela não
bloqueia o estudo, a navegação, a exportação de progresso nem os controles
independentes de favoritos e posição de leitura. Mudanças comuns de curso,
aula, categoria ou busca não tornam incompatível uma consulta desse histórico
global.

Atualizar a biblioteca invalida as referências e respostas anteriores. Uma
geração própria protege a aceitação do payload e seu `finally`: a conclusão
de uma consulta antiga não pode restaurar linhas nem liberar o carregamento
de outra consulta mais nova.

Respostas 403 e 419 usam o encerramento de acesso existente. As linhas,
cursor e mensagem são apagados, o painel é fechado e ocultado, e os controles
são desabilitados. Respostas tardias, inclusive JSON que já começou a ser
decodificado, não restauram o histórico.

Falha HTTP, DTO inválido ou página posterior inconsistente limpa o snapshot e
mostra indisponibilidade com recuperação manual. Esse estado não se transforma
em um histórico vazio válido e não desfaz uma conclusão já confirmada.

## Concorrência com a conclusão de uma aula

O fluxo existente de conclusão continua sendo a única escrita de progresso.
O novo painel nunca envia POST, altera uma conclusão ou fornece uma confirmação
alternativa para uma escrita incerta.

O cache do histórico é invalidado em dois pontos da tentativa explícita de
conclusão:

1. Antes do POST, para descartar uma consulta iniciada anteriormente.
2. No `finally` da tentativa completa, incluindo a reconciliação já existente,
   para descartar uma consulta iniciada enquanto a escrita estava pendente.

A invalidação final acontece mesmo quando o aluno já navegou para outra aula
ou o recibo se tornou incompatível com a seleção atual. Ela afeta somente o
histórico global; não muda o novo curso, o corpo da aula ou seus controles.
Se o acesso já foi revogado, o `finally` preserva a limpeza feita por
`lockAccess`.

Não foi criado outro estado global de escrita. Nenhuma linha é inserida
otimisticamente, nenhuma consulta é disparada automaticamente e nenhum POST
é repetido. Uma consulta de histórico vazia ou parcial não confirma uma
conclusão incerta, não reabilita seu botão e não substitui o GET de progresso
individual usado pelo fluxo existente.

## Interface e seletores

O painel é global e fica depois dos controles de favoritos, fora da lista de
cursos e do conteúdo da aula. O `details` mantém o topo compacto. O estado da
consulta usa uma região de status, datas têm `time[datetime]`, e referências
longas podem quebrar linha em telas estreitas.

| Elemento | Seletor |
| --- | --- |
| Painel recolhível | `#progress-history-panel` |
| Consulta ou atualização manual | `#reload-progress-history` |
| Lista | `#progress-history-list` |
| Linha | `[data-completion-id]` dentro da lista |
| Status | `#progress-history-status` |
| Próxima página | `#more-progress-history` |

## Arquivos e verificação

Implementação: `resources/views/university/student.blade.php`.

Checker focal: `scripts/check-progress-history.mjs`.

Módulo Chromium: `scripts/qa-browser-progress-history.cjs`.

Foram executados localmente, sem navegador, servidor ou banco:

- **38 cenários Node** do C126, com o script completo da view e seus handlers
  reais; os cenários de DTO incluem vários vetores de campos, tipos e datas.
- A suíte principal `scripts/check-ui-contract.mjs`, após as adaptações
  mecânicas dos ambientes sintéticos existentes, com todas as asserções
  anteriores preservadas. O checker C126 foi executado separadamente; sua
  importação é feita na integração.
- `node --check scripts/qa-browser-progress-history.cjs`.
- `git diff --check`.

O checker focal cobre campos permitidos, versões distintas, ausência de teto
total, calendário UTC, duplicatas, cursor removido, atualização manual,
preservação de estudo e preferências, falha versus vazio, consulta antiga
versus nova, início e término de conclusão, consulta pendente durante o POST,
resultado tardio depois da navegação, conclusão incerta e 403/419.

O módulo Chromium prepara **28 verificações** em contexto isolado, com
fixtures por página e esperas limitadas. Exercita o painel visível, páginas,
respostas malformadas, leitura independente, invalidação de consultas nas duas
fronteiras da conclusão, navegação durante escrita, incerteza e revogação.
Respostas controladas são liberadas no cleanup; nenhuma fixture compartilhada
do runner é alterada.

Os checkers C112, C116, C118 e C120 receberam somente as novas dependências
reais de invalidação/renderização e o estado necessário em seus harnesses. O
harness específico do checker principal recebeu os dois stubs correspondentes.
Nenhuma asserção anterior foi removida. Imports, runners principais e percurso
Laravel real são integrados separadamente pelo coordenador.

Chromium, PHP e PostgreSQL não foram executados localmente. Este documento não
atribui aprovação de CI ao novo código; a evidência será vinculada ao SHA
integrado que efetivamente executar os laboratórios.

## Integração e percurso real preparado

O checker foi importado pelo principal e o módulo foi incluído no runner
sintético. O checker principal completo passou no checkout integrado, incluindo
os 38 cenários novos e todas as suítes anteriores. Os 14 caminhos de escrita
mantiveram a proteção transacional; o histórico acrescenta somente GET.

O percurso Laravel/SQLite consulta manualmente as duas empresas antes da
primeira conclusão. A conclusão de A invalida o resultado anterior sem inserir
linha otimista ou consultar automaticamente; a nova consulta de A encontra a
referência, enquanto B continua vazia. Cada consulta confere o envelope e os
seis campos permitidos, a data UTC, a ausência de links/ações nas linhas e a
preservação de curso, aula, filtros, contadores, favoritos e posição.

A retirada conserva ID/data/versão e muda a disponibilidade da aula exata.
A republicação mantém a conclusão da versão 1 indisponível e a versão 2
pendente, inclusive após a ida e volta por sugestões. A revogação fecha e
purga uma lista efetivamente consultada; a nova entrada elegível só a recupera
por consulta manual e conserva a mesma referência. O percurso prepara capturas
do histórico em 1440 e 390 pixels e verifica a largura móvel. Os dados finais
de progresso do laboratório permanecem inalterados.

O backend, a interface e esse complemento do percurso receberam revisão
independente. A sintaxe e o diff passaram; a execução real ficou inicialmente
pendente da CI, sem navegador, PHP ou banco executados localmente.

## Evidência integrada e inspeção visual

O SHA `b67b9a44f92f538a2f595324b6e24dc78304e9c1` passou nos seis jobs da
[execução 44216815401](https://github.com/rafhael100/imagine-universidade/actions/runs/44216815401).
Foram observadas **523 verificações Chromium**, incluindo as **28 de C126**,
e **169 verificações no percurso Laravel/SQLite real**. O backend completou
270 testes e 3.111 asserções; o probe de histórico em PostgreSQL também passou.

As capturas `framework-progress-history-desktop.png` e
`framework-progress-history-mobile.png`, do artefato de navegador real,
foram inspecionadas. Em 1440 e 390 pixels, a referência retida, versão,
data UTC com segundos, disponibilidade e atualização manual ficaram legíveis;
o painel móvel não apresentou transbordamento horizontal. A referência
indisponível não oferece título de conteúdo, link nem navegação para a aula.
Esta evidência pertence ao SHA acima e não libera os gates operacionais.

## Limites preservados

O formato de exportação de progresso v1 e seus limites permanecem intactos.
O histórico paginado não altera retenção, fonte de elegibilidade, autorização,
identidade ou o gateway de IA. Não registra visualização, tempo ou comportamento,
não persiste dados no navegador e não cria um caminho para ler material retirado.
O provider operacional continua dependendo da integração Portal autorizada.
