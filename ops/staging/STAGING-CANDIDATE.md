# UNI C-62 — stack de homologação privada, sem execução

15/11/2026 · **DRAFT / HOLD_NO_GO / NO-MERGE / NO-DEPLOY**.

Arquivos candidatos para futura homologação MANUAL na VPS Leaseweb: `ops/staging/compose.yaml`, `Dockerfile.php`, `Dockerfile.nginx`, `nginx.conf` e template de ambiente.

- Aplicação: Laravel 13 em PHP 8.4-FPM, dependências `composer.lock` sem dev/plugins/scripts, fontes de imagem allowlist, usuário `www-data`, código somente leitura, volumes exclusivos para storage e cache, sem migrations ao iniciar e sem login ou tutor reais.
- Web: Nginx limitado a `public/`, PHP executável somente via `index.php`, cabeçalhos básicos anti-indexação, porta exigida pelo operador **exclusivamente em 127.0.0.1**. Proxy HTTPS de host/VPN e controle de acesso precisam ser autorizados separadamente.
- Banco: PostgreSQL18 com rede `internal`, volume exclusivamente da Universidade, sem porta host. Owner separado e app runtime **não são a mesma conta**. O stack NÃO cria/concede privilégios a runtime: DBA deve criar e conceder somente SQL mínimo depois de revisar migrations/RLS e antes de iniciar a aplicação.
- Sessões: tabela criada em C-61; o template sugere `SESSION_DRIVER=database`, criptografia e cookies seguros, mas requer gestão de APP_KEY, expiração, backups protegidos e retenção LGPD.

**Não executar** `up`, `migrate`, `grant` ou `deploy` até resolver Portal #886 e os 13 gates de `ops/release-gates.json`: contrato ativo/autorizado, revogação, SSO tenant, equipe editorial, S2S seguro, revisão AppSec/DBA/LGPD, HTTPS/VPN, porta realmente livre, backup/restauração e rollback, consentimento e publicação manual.

## Verificação estática sem tocar VPS

`node ops/staging/check-compose-static.mjs`

O teste CI lê o YAML como texto, confere a restrição de porta, redes, limites, papéis e bindings deny-all, mas NÃO inicia os contêineres. A verificação sintática futura de Docker Compose deve ser executada com `docker compose --env-file .env.staging -f compose.yaml config --quiet` **somente** no ambiente autorizado, sem imprimir segredos. Template contém marcadores que impedem uso inadvertido. Não reutilizar portas (especialmente 18081), volumes, banco ou credenciais do CRM/Sites/Portal.

## Validação de configuração do Compose

O CI executa `bash ops/staging/check-compose-syntax.sh` com variáveis e segredos estritamente **fictícios**, em um arquivo transitório apagado ao final. O único comando Docker é `docker compose config --quiet` (parsing), sem acessar a VPS, iniciar serviços ou reservar porta; `18123` é só um exemplo de sintaxe e não deve ser usada como porta escolhida. A validação de recursos reais e segurança continua bloqueada.
