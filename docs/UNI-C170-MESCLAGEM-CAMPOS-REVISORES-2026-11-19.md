# UNI C170 — Mesclagem conservadora e correção do ensaio Chromium

## Falha real na CI C168

O job browser-lab da execução
https://github.com/rafhael100/imagine-universidade/actions/runs/44479147373
falhou porque um listener legado, instalado para um CSV inválido,
permaneceu aguardando um diálogo que não deve mais existir.
Quando a substituição explícita abriu o diálogo, dois listeners
tentaram tratá-lo; o segundo recebeu "Cannot dismiss dialog which
is already handled". Os outros cinco jobs passaram.

O listener obsoleto foi removido, sem suprimir o teste de conflito.
O cancelamento é agora comprovado pelo aviso explícito da interface.

## Proteções ampliadas

- Uma aula marcada PENDING com revisor/evidência local ainda
  digitados não pode ter esses campos substituídos por importação.
- Uma aula já revisada recusa observação PENDING de outro arquivo
  se essa observação não coincide com o texto local.
- A importação continua atômica: conflito em uma aula significa
  nenhuma substituição em qualquer das 35.
- Novos cenários em Chromium exercitam ambas as condições e
  preservam a mesclagem da C167.

## Auditoria de integração da main

A mesma candidata inclui a prova documental C169 com seis arquivos
de governança de hash idêntico à main examinada e indicação de que
o README possui mudanças intencionais de desenvolvimento. Não
ocorre merge nem resolução automática.

**Sem serviço real, SSO, publicação, merge, deploy ou novos custos.**
