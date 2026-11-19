# UNI C180 — Limite de 1 MB medido em bytes no CSV editorial

**19/11/2026 · DRAFT / HOLD_NO_GO**

O revisor no navegador já recusava arquivos acima de 1 MB antes de ler. O validador Node, contudo, carregava tudo em memória e só depois limitava o número de caracteres. Arquivos grandes poderiam consumir recursos desnecessários; UTF-8 com caracteres multibyte também torna contagens de bytes e caracteres diferentes.

O CLI passa a abrir o arquivo, verificar que é regular e tem até 1.000.000 bytes antes da leitura, confirmar novamente o tamanho após a leitura e fechar o descritor inclusive em falhas. A verificação UTF-8 estrita C178 permanece ativa.

Os testes negativos criam arquivo sintético de 1.000.001 bytes: o CLI deve recusá-lo antes de parsear, e o Chromium deve informar o limite sem perder a revisão já importada. Sem alterações de dados reais, grants, deploy, custos ou release gates. Portal #886 e HOLD_NO_GO permanecem.
