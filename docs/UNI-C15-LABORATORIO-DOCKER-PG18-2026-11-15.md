# UNI C-15 — laboratório descartável PHP/Laravel e PostgreSQL 18

**15/11/2026 · Preparação de homologação, sem execução · DRAFT / NO-MERGE / NO-DEPLOY**

## Objetivo
Executar os testes reais do Laravel/SQLite e das migrações do PostgreSQL 18 em um ambiente **completamente sintético**, usando a infraestrutura Docker de desenvolvimento já existente, sem depender de um workflow GitHub Actions na main e sem tocar a VPS de produção.

## Arquivos
- `compose.qa.yml`: serviços PostgreSQL18 e QA efêmeros, sem portas no host, sem bind mounts, sem volumes permanentes; banco `uni_ci` com credenciais sintéticas; QA compartilha somente a rede do DB para usar localhost.
- `ops/qa/Dockerfile`: imagem PHP 8.4, Composer, Node e Python; instala pdo_pgsql/pdo_sqlite e extensões de teste; executa como usuário não root; **COPY allowlist** de fontes, testes e scripts.
- `.dockerignore`: inclui apenas caminhos de código/QA e exclui .env, chaves, certificados, .git, vendor, artefatos e arquivos de contexto não necessários.
- `scripts/qa-compose-entrypoint.sh`: valida APP_ENV e parâmetros de banco fixos, falha se houver .env ou git dentro da imagem, executa PHP lint, 40 testes sintéticos de domínio, 12 SQLite, contrato de UI, Composer descartável, PHPUnit Unit/Feature, rotas Laravel, migrações PG18, esquema PG e fluxo relacional PG.
- `scripts/check-pg-flow.php`: oito verificações do esquema real PostgreSQL para catálogo publicado, idempotência, histórico e isolamento de progresso por cliente. Todas as inserções SQL estão dentro de transação **revertida integralmente** ao final; erros de FK/unique são testados com SAVEPOINT.
- `scripts/run-qa-compose.sh`: iniciador manual, recusa Docker remoto/não padrão e checkout com .env, usa projeto Docker exclusivo e limpa serviços/volumes ao sair ou receber sinais.

## Como iniciar, SOMENTE quando houver um checkout de testes isolado e Docker permitido
A partir da branch da PR C-15 em uma máquina ou contêiner de desenvolvimento, sem .env real:

`bash scripts/run-qa-compose.sh`

O iniciador constrói a imagem (pode baixar imagens/pacotes), executa QA e realiza cleanup ao terminar. **Nunca usar em produção e nunca executar diretamente na máquina que hospeda o banco real**; o script recusa contextos Docker remotos, mas não consegue identificar sozinho todas as topologias de infraestrutura. Verificar capacidade, armazenamento, tempo de CPU, franquias e possíveis custos de tráfego antes de iniciar.

## Verificações feitas nesta rodada
- Docker e PostgreSQL não estão instalados nem disponíveis no ambiente de execução desta conversa, portanto **o Compose NÃO FOI EXECUTADO**.
- A configuração YAML equivalente foi analisada por PyYAML, com oito invariantes aprovados: profile manual, imagem PostgreSQL18, sem portas públicas, sem mounts, dados tmpfs, rede compartilhada com DB, banco sintético e APP_ENV testing.
- A verificação do script SQL PostgreSQL é apenas leitura estática nesta rodada; **não passou por PHP lint nem por PostgreSQL real**.
- Testes anteriormente executados: 40/40 em PHP puro e 12/12 SQLite sintético, separados dos testes Laravel.

## Gate de homologação seguinte
1. Revisar e fixar `composer.lock` numa execução autorizada e reprodutível; a resolução sem lock na imagem é somente diagnóstico, nunca release.
2. Executar o comando acima em uma instância isolada e capturar falhas reais de Laravel, Docker, migrações e PostgreSQL18; corrigir em PR sem merge.
3. Com a suíte aprovada, testar corrida de publicação/edição/progresso e isolamento multiempresa em banco efêmero.
4. Concluir a fonte real de elegibilidade, permissões e sessão do Portal (issue #848) e revisão AppSec/DBA/LGPD.
5. Fazer go/no-go, plano de backup e rollback, autorização de deploy e só então abrir homologação privada com clientes de teste.

**Sem execução Docker/Composer/PG18, sem deploy/merge, sem novos serviços pagos, sem tokens ou clientes reais nesta entrega.**
