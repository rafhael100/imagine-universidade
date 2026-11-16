# UNI C-61 — preparar sessões persistentes, sem habilitar SSO

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

A fundação Laravel usa `SESSION_DRIVER=array` em laboratórios (nenhuma sessão operacional); o futuro staging privado exige persistência para que uma sessão autenticada do Portal não desapareça entre instâncias PHP. Foi criada a migração `sessions` compatível com o session handler do Laravel, com ID, usuário local opcional, IP e agente opcionais, payload e última atividade. A migração não cria usuários, não autentica nem valida contratos; a autoridade Portal default segue **deny-all**.

O uso futuro de `SESSION_DRIVER=database` requer **somente** implantação autorizada, `SESSION_ENCRYPT=true`, cookies `Secure`/`HttpOnly`/`SameSite` em TLS, gestão/rotação da chave Laravel, segregação de papel SQL, purga de sessões expiradas, backup criptografado e retenção conforme análise LGPD. Não é permitido reutilizar o valor `user_id` como identidade empresarial do Portal; o grant deve ser verificado por integração oficial separada, com revogação atual.

A suíte Feature valida migração SQLite em memória, ausência de sessões ou empresas reais, inserção fictícia isolada e negação de rota privada. PostgreSQL18 recebe a tabela via migrations de QA; não há novo serviço na VPS.
