# UNI C165 — Exportar resumo da revisão para a coordenação

A tela offline exporta `resumo-revisao.txt` com um índice dos dez
cursos, contagens de 35 aulas, status, hashes, observações e evidências
**informadas**, nunca verificadas automaticamente.

O resumo é uma exportação local por `Blob`, sem chamada HTTP, sem
armazenamento oculto, upload ou criação de issues. A frase
`HOLD_NO_GO — NÃO É APROVAÇÃO NEM PUBLICAÇÃO` aparece no arquivo.

O CSV continua sendo a única forma prevista de preservar o estado
editável; exportar o resumo **não limpa o indicador de alterações não
salvas**. Se existir uma célula malformada ou com fórmula, a exportação
é recusada antes de produzir qualquer arquivo.

O laboratório Chromium valida download, contagens 34+1, hashes,
observação literal, ausência de aceite e aviso de alterações ainda
não exportadas em CSV.

Sem SSO, autorização de serviço, merge ou deploy. A revisão
assinada por pessoas responsáveis e os 13 gates permanecem pendentes.
