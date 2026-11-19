# UNI C-196 — Proibir redirecionamento libpq no ensaio de restauração

19/11/2026 · QA descartável PostgreSQL18 · HOLD_NO_GO.

## Risco

POSTGRES_DB/USER/PASSWORD iguais aos sintéticos não impediam que alguém
definisse PGHOST, PGHOSTADDR, PGPORT ou PGSERVICE no ambiente do cliente
psql/pg_dump. Sem outra proteção, a consulta poderia seguir para host remoto.

## Controle acrescentado

- Recusa antecipada de variáveis libpq que alteram host, serviço, credencial,
  transporte SSL, opções e banco, mesmo quando estiverem vazias.
- Exigência do socket Unix local /var/run/postgresql/.s.PGSQL.5432;
  PGHOST e PGPORT fixados para todos os subprocessos de backup e restore.
- Preflight SQL exige inet_server_addr() NULL, banco uni_ci e role uni_ci.
- Regressão Docker injeta PGHOST=synthetic-unreachable.invalid e exige
  mensagem de recusa antes de qualquer consulta, depois realiza o ensaio
  legítimo de restauração como anteriormente.

Não insere credenciais reais, usa somente imagens e bancos descartáveis,
não conecta redes externas e não modifica VPS/serviços operacionais.

O gate de backup real continua NOT_VERIFIED; isto não prova RPO/RTO ou R2.
