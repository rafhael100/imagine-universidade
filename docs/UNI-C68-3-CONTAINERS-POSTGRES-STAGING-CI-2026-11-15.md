# UNI C-68 — staging de três serviços com PostgreSQL real em CI, sem VPS

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

Este é um ensaio mais próximo do futuro staging: em um runner descartável, são iniciados **PostgreSQL18, Laravel PHP-FPM e Nginx**, conectados somente a uma rede Docker `--internal`, com volumes e nomes exclusivos, sem publicar nenhuma porta do host.

Uma execução efêmera de migrations utiliza um usuário *owner* fictício do PostgreSQL. Em seguida a CI cria um usuário *runtime* diferente, aplica a matriz de GRANT mínimos de C-66 e inicia o aplicativo com esse usuário, sessões em banco, criptografia e cookie seguro. O cliente HTTP executa smoke de `/up` e oito rotas privadas negadas, sem login real, sem registro de cliente, sem fonte comercial oficial e sem qualquer concessão de acesso. O cleanup elimina contêineres, rede e volume mesmo em erro.

As senhas são valores constantes inventados e **restritos ao runner descartável**, jamais usados na VPS. A porta de staging real continua sem escolha definitiva. O ensaio não conecta gateways, CMS, Portal, tutor AI ou alunos reais. Não substitui homologação segura de infraestrutura, privacidade e backup/rollback no servidor real, nem resolve a fonte oficial de serviços elegíveis do Portal #886.
