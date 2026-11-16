# UNI C-47 — dupla autorização de leitura após consultas HTTP

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.**

O middleware da Universidade agora verifica **novamente o Portal antes de liberar qualquer resposta GET/HEAD**, conferindo continuidade de permissão, empresa, identidade e revisão. Se o Portal ficar indisponível, a última assinatura/serviço elegível for cancelada ou a sessão mudar enquanto o banco responde, o middleware substitui o conteúdo por HTTP 403 com CSP e Cache-Control restritivos.

O repositório educacional também revalida a vigência do grant **depois** de ler o conteúdo de aula, o progresso de uma aula, a lista de cursos do editor e as aulas editoriais. Catálogo, lista de aulas e exportação já faziam esta revalidação no domínio.

**Testes adversariais** forçam a fonte sintética a revogar o último serviço durante o SQL do catálogo e a cair durante a consulta de auditoria administrativa. Ambos os retornos devem ser 403 sem vazamento de conteúdo. Não existe provider real habilitado; o Portal #886 permanece bloqueador.

A segunda verificação é deliberadamente aplicada a leituras. Os POST/PATCH/DELETE continuam dependendo das verificações e bloqueios **dentro de suas operações**. Revalidar apenas a resposta após uma escrita já confirmada poderia informar erro ao navegador apesar do efeito no banco. Homologação operacional futura deverá revisar novamente janelas de concorrência, fontes oficiais e tratamento de eventos de revogação transacional.
