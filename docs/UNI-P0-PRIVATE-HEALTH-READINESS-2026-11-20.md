# UNI P0 — sinal de saúde na candidata de homologação privada

**20/11/2026 — PR DRAFT / HOLD_NO_GO; sem merge, deploy nem execução na VPS.**

## Lacuna concreta
A stack candidata de três serviços em `ops/staging/compose.yaml` verificava saúde do PostgreSQL, mas **não verificava a disponibilidade do caminho web → PHP-FPM → Laravel**. O container `web` podia constar como *running* mesmo quando a aplicação não atendia HTTP.

## Alteração mínima (sem novo módulo)
- Acrescentado `healthcheck` ao serviço `web`: requisição local `http://127.0.0.1:8080/up`, timeout de 3 segundos no cliente, 5 segundos no Compose, intervalo de 15 segundos, três tentativas e 30 segundos de inicialização.
- Utiliza a rota `/up` **já existente** no Laravel; não cria login, endpoint de negócio ou catálogo público. A porta publicada pelo Compose permanece vinculada a `127.0.0.1`.
- Os verificadores existentes agora recusam remoção do healthcheck, URL externa, rota de aluno/Admin, alteração de porta pública, resposta artificial de Nginx, desativação da rota Laravel e perda do upstream PHP-FPM. O modelo resolvido do Compose também deve preservar o teste de saúde.
- A CI específica faz inspeção estática + `docker compose config` com variáveis exclusivamente sintéticas, sem construir/iniciar serviços e sem criar backup.

## Limites da evidência
Uma verificação estática verde **não comprova** que a aplicação respondeu HTTP em container real, que o PostgreSQL é acessível pelo papel runtime, que o Portal reconhece contratos ativos ou que houve reversão/rollback. Um retorno 200 de `/up` tampouco comprova sessão, catálogo, progresso, autorização ou backup. Sem a autoridade homologada do Portal #848/#886, todos os acessos privados seguem negados por padrão.

**Pendência de reprodutibilidade:** `composer.lock` fixa pacotes PHP, mas as imagens base do Compose/Dockerfiles ainda usam tags mutáveis (`postgres:18`, `php:8.4-fpm-bookworm`, `nginx:stable-alpine`, `composer:2`). Para uma candidata de release imutável, um responsável deverá validar e fixar digests multi-arquitetura e registrar os identificadores finais de imagens. Esta PR não inventa nem fixa digests de registry não verificadas.

## Próxima prova necessária (somente após autorização apropriada)
1. Inventário local **somente leitura** da VPS pelo procedimento existente; confirmar porta, contêineres, redes, volumes e recursos reais sem escolher porta automaticamente.
2. Em laboratório privado isolado e autorizado, ensaiar `healthy` quando Nginx/FPM/Laravel funcionarem e `unhealthy` quando o upstream falhar, sem tocar tráfego real; registrar digest, SHA e logs higienizados.
3. Com PostgreSQL descartável e configuração efetiva autenticada **antes** de migrations, executar a jornada sintética Cliente/Admin/DB, preservando deny-all na integração operacional.
4. Ensaiar backup, restauração integral, reversão de versão e rollback com RPO/RTO em ambiente aprovado; o ensaio sintético do PostgreSQL em outras SHAs não satisfaz o gate real.
5. Registrar revisão AppSec/DBA/LGPD, elegibilidade e revogação oficiais, sessão empresarial/MFA, staff editorial e 13 evidências na fila única [Universidade #12](https://github.com/rafhael100/imagine-universidade/issues/12). **Não alterar os gates via CI.**

Conteúdo das 35 aulas da [candidata #149](https://github.com/rafhael100/imagine-universidade/pull/149) e aceite humano permaneceram intocados. Referência histórica integrada: PR #85.

**13/13 gates NOT_VERIFIED · HOLD_NO_GO.**
