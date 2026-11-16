# UNI C-52 — Serialização de operações editoriais no navegador

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Operações editoriais de criar, editar, excluir, publicar e retirar do ar agora usam uma trava única de execução na interface (`beginWrite`/`finishWrite`). Isso impede duplo envio acidental, invalida resultados de buscas anteriores, mantém a região de edição com `inert` e `aria-busy` durante a operação e captura os IDs de curso/aula antes de chamadas assíncronas. O comando reabilita a interface após sucesso/erro sem trocar de curso. Após 403/419 a interface permanece bloqueada até nova sessão oficial.

Teste Node simula submissões duplicadas, retorno à edição, invalidação de requisições e negação persistente. A barreira de navegador não substitui idempotência ou autorização server-side, que continuam aplicadas.
