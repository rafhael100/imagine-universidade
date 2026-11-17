# UNI C-115 — Credenciais separadas no ambiente candidato

## Problema reproduzível no template

O serviço `app` de `ops/staging/compose.yaml` declarava `env_file: .env.staging`. Esse arquivo também contém as variáveis de interpolação do papel proprietário do PostgreSQL. Embora `DB_USERNAME` apontasse para o papel runtime, a aplicação recebia as credenciais de maior privilégio como variáveis adicionais. Isso contrariava a separação de papéis pretendida.

O achado refere-se ao template candidato. Não foi inspecionado nem alterado um ambiente implantado, e não representa constatação de exposição na VPS.

## Correção

O arquivo informado por `docker compose --env-file` serve apenas à interpolação. O serviço da aplicação recebe uma lista explícita de configurações Laravel, sessão, log, correio em memória e conexão runtime. As credenciais do proprietário ficam apenas nas variáveis `POSTGRES_USER` e `POSTGRES_PASSWORD` do banco. O Nginx não recebe segredos da aplicação ou banco.

`APP_KEY` e `APP_URL` continuam obrigatórios. Cookies mantêm o nome exclusivo da Universidade. Os padrões de produção permanecem negados por `UnavailablePortalAuthority` e `DisabledTutorGateway`.

## Verificação

O verificador cobre 14 casos: configuração válida e rejeição de credenciais do proprietário, variáveis inesperadas, reaproveitamento de usuário/senha, ausência de chave, debug, banco divergente e segredos no serviço web. Mensagens de falha não imprimem os valores inspecionados.

A CI usa `docker compose config --format json` com valores exclusivamente fictícios e verifica o modelo efetivamente resolvido, incluindo uma variável extra que não pode alcançar nenhum serviço. O JSON transitório tem permissão restrita e é removido ao final. Nenhum contêiner é iniciado nessa etapa; ela não acessa a VPS, escolhe porta real nem cria credenciais.

Permanecem as revisões operacionais e `HOLD_NO_GO`. A correção torna o template revisável sem declarar a infraestrutura homologada.
