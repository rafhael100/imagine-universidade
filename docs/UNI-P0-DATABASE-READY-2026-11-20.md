# UNI P0 — readiness PostgreSQL no healthcheck da candidata privada

20/11/2026 · DRAFT · HOLD_NO_GO · **somente Docker descartável**.

## Falha efetivamente reproduzida

[GitHub Actions #44833961259](https://github.com/rafhael100/imagine-universidade/actions/runs/44833961259), SHA `a4ad23d79712d3e4ec27d531bd5f41fb7b1b26b5`, falhou no estágio `postgres_outage_health_negative`: o PostgreSQL18 descartável estava parado, porém o Nginx continuava `healthy`. Os testes anteriores de FPM e negação privada passaram, comprovando especificamente a ausência de dependência SQL no `/up`. Não reutilizar a run como evidência de sucesso.

## Correção mínima, sem novo endpoint nem módulo

O listener oficial Laravel `DiagnosingHealth` no `AppServiceProvider` exige `SELECT 1` no banco **configurado efetivamente**. Em falha, lança exceção genérica sem preservar mensagem SQL/credenciais. O healthcheck Nginx existente continua usando loopback e `/up`. Nenhuma mudança em `PortalAuthority`, permissão, rota Cliente/Admin, fonte de elegibilidade, migrations ou conteúdo.

O ensaio de push executa, em runner local e rede sem portas externas: builds presos ao `composer.lock`, guarda de 13 gates, configuração Laravel e SQL PostgreSQL autenticado **antes** das migrations, HTTP inicial `/up=200` e oito rotas privadas `403`; parada/retorno do PHP-FPM; parada do PG com exigência de `unhealthy`, HTTP `/up` não-2xx e corpo sem SQL/stack, sete rotas privadas sem autorização; reinício do PG, SQL autenticado e sessões persistidas, `healthy` e oito rotas `403`.

**Não confundir:** sintético não prova saúde, backup/restauração, RPO/RTO, rollback ou permissões no servidor privado. Evidência de acesso Portal #848/#886 e owner de serviços ativos permanece ausente. Não habilitar SSO, grants, deploy ou real enrollment; sem aceite humano das aulas #149. Todos os 13 gates `NOT_VERIFIED`.

Código/revisão: branch `review/uni-p0-db-aware-health-2026-11-20`; usar HEAD final e run vinculada ao commit para qualquer registro de QA. Se CI estiver pendente, registrar `PENDING`, nunca sucesso.
