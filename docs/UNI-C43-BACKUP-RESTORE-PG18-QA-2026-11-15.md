# UNI C-43 — restauração real de backup PostgreSQL18 sintético no Docker

15/11/2026 · QA laboratorial · DRAFT / NO-MERGE / NO-DEPLOY

Após o ensaio Laravel/SQLite e PostgreSQL 18 e a carga editorial idempotente (10 cursos / 35 aulas), o runner Docker chama o shell **dentro do próprio contêiner PostgreSQL descartável**. O script verifica POSTGRES_DB/USER/PASSWORD fixos, versão 18 e ausência da base `uni_ci_restore`, recusa qualquer outra configuração, cria `pg_dump -Fc` local, restaura em uma segunda base com `pg_restore`, compara contagens de cursos/aulas/publicações/progresso e fingerprint MD5 ordenada dos textos das 35 aulas. A segunda base e o arquivo temporário são removidos ao final; o script externo remove os volumes/contêineres no trap mesmo em caso de falha.

A alteração não toca VPS, bancos reais, chaves, backups de produção, Cloudflare R2, DNS nem GitHub secrets. Demonstra somente uma restauração técnica de dados sintéticos e NÃO substitui estratégia de backup real, criptografia/retentiva, restauração de grandes volumes, validação DBA/LGPD nem plano de rollback/deploy. Scripts também passam por `bash -n` e `sh -n` no job isolado.
