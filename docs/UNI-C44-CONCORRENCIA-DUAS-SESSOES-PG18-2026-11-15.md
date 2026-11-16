# UNI C-44 — concorrência editorial real de duas conexões PostgreSQL18

15/11/2026 · QA sintético · DRAFT / NO-MERGE / NO-DEPLOY

O script `check-pg-concurrency.php` cria duas conexões PDO de backend diferentes à base efêmera `uni_ci`. Em um registro editorial sintético, a conexão A toma `SELECT FOR UPDATE` (mesma classe de bloqueio das operações Laravel de edição e publicação). Enquanto A mantém o lock, B inicia sua transação e tenta atualizar o mesmo curso com limite de espera 250ms; a operação deve falhar com SQLSTATE 55P03, sem mutar a linha. Após rollback de A, B repete a atualização e confirma sucesso. O registro de organização e curso é apagado em bloco de limpeza, inclusive se o teste falhar.

As guardas recusam execução fora do banco, host, usuário e senha **sintéticos** fixos. O ensaio ocorre tanto no job PostgreSQL18 descartável do GitHub Actions quanto no contêiner Docker separado, sem tocar clientes, VPS, segredos, transações reais ou release. O resultado confirma comportamento de lock em duas conexões, não substitui teste de carga/concorrência em homologação com SSO e dados reais autorizados.
