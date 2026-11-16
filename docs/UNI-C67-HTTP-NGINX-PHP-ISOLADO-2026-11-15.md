# UNI C-67 — HTTP end-to-end privado em dois contêineres reais

15/11/2026 · DRAFT / NO-MERGE / NO-DEPLOY.

O laboratório de imagens passa de `nginx -t` e Laravel `route:list` para **um ensaio HTTP real e isolado**: o CI cria uma rede Docker interna descartável, inicializa PHP-FPM Laravel e Nginx não-root sem publicar portas ou sockets no host, e utiliza um terceiro contêiner efêmero apenas para requisitar `/up` e oito URLs privadas.

O script exige runner GitHub autorizado, Docker default local, imagens construídas do mesmo PR e ausência de `.env`. Ingressos fictícios/forjados devem receber **403 com cabeçalhos CSP, DENY e no-store**; `/up` precisa responder 200. Todos os contêineres e a rede são destruídos via `trap` mesmo em falhas. App sem DB real, com sessão array e `UnavailablePortalAuthority` ativa; trata-se de uma integração de rede **sem dados pessoais ou serviços ativos**.

Esta prova é anterior, e não substitui, SSO/serviços elegíveis oficiais, revisão AppSec/DBA/LGPD, backup/rollback reais, TLS/VPN da VPS ou deploy. Não há porta exposta no computador do usuário nem no servidor Leaseweb.
