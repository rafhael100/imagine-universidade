# C-118 — exportação privada dos favoritos na interface do aluno

17/11/2026 · Implementação e verificadores locais concluídos. Ensaio Chromium
reservado à CI descartável. **HOLD_NO_GO** operacional.

## Entrega

O aluno encontra **Exportar meus favoritos** junto ao filtro de favoritos e à
recuperação dessa consulta. O botão fica disponível depois da autorização e da
validação do catálogo, inclusive quando o catálogo está legitimamente vazio.
A listagem atual de favoritos pode estar vazia, pendente ou indisponível sem
bloquear essa exportação pessoal.

Esta interface complementa o
[contrato backend C-118](UNI-C118-EXPORTACAO-FAVORITOS-PRIVADOS-2026-11-17.md)
e a preferência pessoal prevista em [UNI-07](10-modulos/UNI-07.md) e
[UNI-12](10-modulos/UNI-12.md). Mantém os seletores e os fluxos de favoritos,
estudo, ajuda e conclusão usados pelo ensaio real C-117. O formato, o botão,
o endpoint e o nome do arquivo de exportação de progresso v1 permanecem iguais.

## Contrato do arquivo

O clique consulta `GET /universidade/private/favorites/export`, usando a sessão
privada existente, `credentials: same-origin` e `cache: no-store`. A interface
não envia empresa, pessoa, ID de curso ou outra seleção para escolher o titular.
A autorização e o recorte dos registros continuam sendo responsabilidade do
servidor.

O arquivo se chama `imagine-universidade-favoritos.json` e contém somente:

```json
{
  "schema_version": 1,
  "scope": "current_authenticated_student",
  "favorites": [
    {
      "course_slug": "referencia-retirada",
      "saved_at": "2026-11-17 10:00:00"
    }
  ]
}
```

O exemplo é sintético. `saved_at` representa a data de criação da preferência
no banco, conforme o backend; não inicia um prazo de expurgo. A exportação pode
incluir uma referência própria retida de um curso retirado. Por isso, a interface
não cruza o arquivo com os cursos ainda visíveis no catálogo. Isso não torna o
conteúdo retirado acessível: não há título, corpo de aula ou ação de navegação no
arquivo.

`sanitizedFavoritesExport` reconstrói o documento com uma allowlist, antes de
criar qualquer Blob. Exige versão e escopo exatos, array com até 5.000 referências,
slug ASCII de até 120 caracteres no formato estrito já usado pelo catálogo e
data textual de até 40 caracteres no formato aceito pela exportação de progresso.
Exige uma referência única por slug. Campos extras de qualquer nível são
descartados; registro inválido, duplicado ou lista acima do limite rejeitam o
arquivo inteiro. Um array vazio explícito continua sendo um resultado válido.

## Estados e concorrência

Há uma única consulta de exportação em andamento. Cliques repetidos, inclusive
eventos disparados enquanto o botão está desabilitado, não criam outra consulta
nem outro download. A interface não repete uma consulta automaticamente depois
de falha. Uma nova tentativa depende de outro clique do aluno.

O estado acessível da exportação usa `#favorites-export-status`, separado de
`#favorites-status`. Assim, preparar o arquivo não apaga uma mensagem sobre
falha de consulta ou resultado incerto de uma gravação de favoritos. Falhas de
rede, JSON ou HTTP recebem texto fixo, sem exibir conteúdo bruto do servidor.
Elas não bloqueiam leitura, conclusão de aulas ou exportação de progresso.

O token `favoriteExportRequest` acompanha a autorização da biblioteca. Reiniciar
`loadLibrary` invalida um pedido anterior, mesmo quando a nova carga é bem
sucedida. A consulta anterior permanece single-flight até terminar. Alterar
apenas o curso, a aula ou os filtros é compatível com a exportação pessoal global
e não muda seu conteúdo.

Uma resposta 403 ou 419 passa pelo `api` e pelo `lockAccess` existentes. A
interface limpa cursos, aula e favoritos, desabilita a exportação e esvazia seu
status. Uma resposta de exportação que chega depois dessa revogação não cria
arquivo nem restaura dados. Há verificações antes de validar o documento e
antes de iniciar o download. O link temporário é removido e a URL do Blob é
revogada após a janela de início do download, inclusive quando uma ação local
do navegador falha.

Nenhuma preferência ou conclusão é gravada por esse fluxo. Nenhuma identidade,
história de exportações ou conteúdo é persistido em armazenamento do navegador.

## Verificação local

`scripts/check-student-favorites-export.mjs` extrai e executa as funções e o
handler reais da view em Node VM. O harness fornece apenas DOM, HTTP e os
primitivos de download. Seus **53 cenários** passaram, cobrindo:

- schema, escopo, slugs, datas, referências duplicadas, limites de 5.000/5.001 e
  remoção de campos pessoais ou editoriais extras;
- arquivo vazio legítimo e referência retida ausente do catálogo atual;
- clique explícito, GET privado sem identidade, filename fixo, Blob sanitizado,
  remoção do link e revogação da URL;
- consulta de favoritos pendente, falha ou vazia sem bloquear a exportação;
- single-flight, recuperação manual e preservação dos demais estados de estudo;
- 403/419, resposta tardia, revogação durante parsing ou criação da URL e
  reautorização da biblioteca;
- ausência de gravações e preservação do contrato de exportação de progresso.

Também passaram `scripts/check-student-favorites.mjs` (50 cenários),
`scripts/check-ui-contract.mjs`, `node --check` do novo módulo Chromium e
`git diff --check`.

## Integração do ensaio Chromium

`scripts/qa-browser-student-favorites-export.cjs` exporta a mesma função dos
módulos anteriores:

```js
module.exports = async function ({
  browser, base, ensureLocalPage, check, pageErrors
}) { /* contexto isolado e fechado no finally */ };
```

São **28 checks previstos**. O módulo usa o curso sintético 1 e as aulas 11/12
servidos pelo runner principal. Deve ser chamado com `completed=false` e flags
de falha do runner limpas, junto dos módulos de aluno e antes dos ensaios de
conclusão ambígua. Ele não altera essas flags.

As respostas controladas pertencem somente às páginas do contexto criado pelo
módulo. O endpoint de exportação e a consulta de favoritos são locais ao ensaio;
dois cenários também controlam inicialização e catálogo para testar bloqueio
antes da autorização e catálogo vazio. A página e seus handlers são reais.

O módulo lê o JSON efetivamente baixado pelo Chromium, verifica referências
retidas e campos descartados, cobre single-flight com navegação de aula,
independência das falhas da lista, recuperação, 403/419 e resposta tardia após
revogação por outra consulta. Ao final exige zero PUT/DELETE de favoritos e zero
POST de conclusão em todos esses cenários.

O Chromium não foi executado localmente nem foram alterados guards para isso.
O resultado de navegador depende da CI autorizada e deve ser registrado pelo
integrador. Esta entrega não ativa a autoridade real do Portal, um fornecedor
de IA, um serviço externo ou uma publicação operacional.
