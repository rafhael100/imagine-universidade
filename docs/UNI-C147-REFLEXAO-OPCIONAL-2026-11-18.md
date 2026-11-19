# UNI C147 — Reflexão opcional durante a aula

18/11/2026. Continuação do código candidato da PR #85 sobre a base C146.

## Finalidade e experiência

O recorte implementa uma prática voluntária prevista em `BASE-UNI-02-03`, `BASE-UNI-02-04` e `BASE-UNI-02-05`: escrever uma explicação própria e compará-la com o material autorizado. A reflexão não é prova, não gera nota, não é corrigida automaticamente e não condiciona a leitura, a conclusão ou a próxima aula.

Cada aula carregada e validada apresenta um painel **Reflexão opcional**, inicialmente recolhido. A pessoa pode escrever até 2.000 caracteres Unicode, revisar com o material ou apagar o texto. O aviso informa que a reflexão não é enviada nem salva e será apagada ao sair da aula, recarregar ou fechar a página, ou quando o material mudar ou ficar indisponível. A orientação pede situações fictícias, sem dados de clientes.

O botão **Revisar com o material** apresenta perguntas para a própria pessoa revisar sua explicação e até dois trechos literais de `EXEMPLO FICTÍCIO` e `APLICAÇÃO OPCIONAL`, na ordem do conteúdo publicado. Cada trecho contém no máximo 1.000 caracteres Unicode, com indicação explícita quando parcial. A fonte identifica o título e a versão exatos. Uma aula sem essas seções remete ao texto completo; não recebe exemplos inventados. O texto digitado não é repetido em outra saída.

## Estado temporário e contexto

O único rascunho fica no valor do `textarea` do painel ativo. Não existe endpoint, estado de banco, arquivo de exportação, armazenamento persistente no navegador, registro de leitura, evento de analytics ou chamada ao Tutor. A referência `activeReflection` guarda o painel e o contexto de curso/aula/versão, sem serializar a reflexão.

Uma nova leitura da mesma aula e versão, com o mesmo corpo autorizado, reutiliza o mesmo painel DOM. Assim, não cria cópias históricas do texto. Mudanças apenas no título atualizam a identificação da fonte e preservam a reflexão. A conclusão confirmada e a atualização válida da biblioteca que conserva o curso também preservam o campo.

A troca de aula/curso, saída por filtros globais, retirada do curso, versão ou corpo diferente, falha na releitura e negação de acesso apagam o campo, o roteiro e a referência ativa. A limpeza ocorre antes de descartar o painel, incluindo elementos que ainda tenham referências de testes. Uma resposta tardia não pode recriá-lo depois da revogação.

O evento `pagehide` esvazia o campo e o roteiro e recolhe o painel, inclusive antes de possível restauração do documento pelo navegador. Ele não altera a sessão ou concede nova autorização. Após retorno, um rascunho apagado não reaparece.

Os handlers verificam a identidade do painel ativo, a geração da leitura, o curso e a aula selecionados, a presença no catálogo autorizado e a conexão do painel com o leitor atual. Botões removidos deixam de produzir efeitos. Enquanto a biblioteca é revalidada, as ações locais não interpretam o estado pendente como autorização.

## Validação e acessibilidade

O campo possui label, instrução de privacidade e descrição do limite associadas. Não é obrigatório e não tem `maxlength` nativo incompatível com caracteres Unicode. A validação conta pontos de código; texto inválido permanece disponível para correção e recebe foco, sem bloquear a conclusão.

Editar o campo invalida o roteiro anterior. Apagar preserva a aula e devolve foco ao campo. Os controles são botões explícitos, sem formulário que possa submeter a reflexão. O roteiro usa texto literal e anúncio de estado. O estilo reutiliza os componentes e as cores da Universidade, com quebra de linhas e adaptação a telas estreitas.

## Evidências locais executadas

- `node scripts/check-student-reflection.mjs`: **30 cenários** com o script completo da view e handlers reais. Somente DOM e HTTP são fronteiras sintéticas. Cobre ausência de requests/storage, caracteres Unicode, fonte literal, preservação em conclusão e releitura, atualização do título, troca de versão/corpo, retirada, falhas, 403/419, handlers removidos, resposta tardia e `pagehide`.
- `node --check scripts/qa-browser-student-reflection.cjs`: sintaxe aprovada.
- `git diff --check`: aprovado.

O módulo Chromium foi preparado para o runner guardado existente, com entrada nativa, teclado, fonte literal, limites Unicode, continuidade e limpeza, além de capturas em 1440 e 390 pixels. **Não foi executado localmente.** Sua aprovação depende da CI do SHA integrado. A integração nos runners e o percurso pelo Laravel real são responsabilidade do coordenador e devem ser registrados com seus resultados efetivamente observados.

## Limites preservados

Nenhum contrato PHP, rota, schema, permissão, gateway do Tutor, fonte de elegibilidade, release gate ou workflow foi alterado por este recorte. A reflexão não libera SSO, acesso operacional, conteúdo editorial nem publicação. A candidata permanece em revisão, sem merge ou deploy decorrente desta entrega.
