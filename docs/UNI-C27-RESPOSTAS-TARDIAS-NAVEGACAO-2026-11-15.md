# UNI C-27 — navegação resiliente a respostas atrasadas

**15/11/2026 · candidato para revisão · DRAFT / NO-MERGE / NO-DEPLOY**

## Problema corrigido

Ao selecionar rapidamente dois cursos ou duas aulas, respostas lentas da
API poderiam chegar fora de ordem. Uma falha tardia de uma seleção antiga
também poderia limpar o conteúdo mais recente da tela.

## Implementação

- Tokens monotônicos `courseRequest` e `lessonRequest` invalidam respostas
  anteriores sempre que uma seleção é iniciada.
- Trocas de busca ou categoria invalidam as solicitações pendentes.
- Tanto sucesso quanto erro de requisição verificam o token antes de
  atualizar o conteúdo. A resposta de conclusão da aula é igualmente
  protegida contra navegação superveniente.
- As requisições continuam privadas e mesmas origem/CSRF, sem nova rota,
  persistência local, credencial ou alteração de dados pedagógicos.

## Testes

`scripts/check-ui-contract.mjs` agora valida os fences explícitos de
sucesso e erro para cursos e aulas. Essa inspeção é de código-fonte, não
substitui testes de corrida em navegador e rede artificialmente lenta,
que ainda devem compor a homologação.

Permissões e provider de produção continuam `deny-all`.
