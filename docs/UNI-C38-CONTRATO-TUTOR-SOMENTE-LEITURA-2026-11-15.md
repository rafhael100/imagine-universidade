# UNI C-38 — Tutor educacional somente leitura, desativado por padrão

**15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.**

Implementação preparatória alinhada à DEC-UNI-P0-07. O endpoint POST /universidade/private/lessons/{lessonId}/tutor herda university.grant:view e sessão CSRF. A API aceita pergunta de 3 a 500 caracteres e exige aula publicada e compartilhada, selecionada **no servidor** conforme o grant. O novo contrato PHP TutorGateway recebe apenas pergunta e texto/slug/versão de aula publicada; sem credencial, e-mail, tenant, nome de aluno, ferramentas de execução, SQL ou ações operacionais.

O binding padrão DisabledTutorGateway lança erro seguro. A API responde 503 tutor_unavailable, sem chamar modelos externos ou armazenar a pergunta; o catálogo e a conclusão estática continuam funcionando. Para um futuro gateway homologado, o controller exige novamente autorização atual do Portal antes de devolver qualquer resposta, inclusive conferindo identidade/empresa/revisão; nega se a sessão for revogada durante a inferência. A fonte de referência enviada ao navegador é derivada da aula no banco, nunca de uma citação inventada pelo modelo.

Testes com autoridade e gateway **sintéticos** verificam indisponibilidade padrão, diferença entre gestão e estudo, resposta não vazada após revogação no meio da chamada e acesso contínuo às aulas estáticas. Isso não constitui implementação de IA real, RAG homologado ou proteção suficiente contra todos os riscos de prompt injection. Ativação exige política P0-07, modelo central homologado, cotas P0-10, privacidade P0-05, fontes aprovadas e Portal #886.
