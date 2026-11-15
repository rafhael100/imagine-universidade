#!/usr/bin/env bash
set -euo pipefail

# No host, production DB, secrets, or live Portal are ever used here.
test -f /.dockerenv || { echo "FAIL: only a disposable Docker container may run QA." >&2; exit 2; }
test "$APP_ENV" = "testing"
test "$APP_DEBUG" = "false"
test "$DB_CONNECTION" = "pgsql"
test "$DB_HOST" = "127.0.0.1"
test "$DB_PORT" = "5432"
test "$DB_DATABASE" = "uni_ci"
test "$DB_USERNAME" = "uni_ci"
test "$DB_PASSWORD" = "synthetic_ci_only"
test ! -e .env
test ! -e .env.production
test ! -d .git

echo "[QA] Ambiente efêmero confirmado; sem acesso a VPS/produção."
php --version | head -n 2
composer --version
python3 --version
node --version

echo "[QA] Análise estática e scripts de domínio antes de instalar dependências."
while IFS= read -r -d '' src; do
  php -l "$src" >/dev/null
done < <(find app bootstrap database routes tests scripts -type f -name '*.php' -print0)
php scripts/check-access-domain.php
php scripts/check-learning-mock.php
php scripts/check-tenant-guard.php
python3 scripts/check-sqlite-contract.py
node scripts/check-ui-contract.mjs

echo "[QA] Instalar dependências versionadas e compatíveis com PHP 8.3."
if [[ ! -f composer.lock ]]; then
  echo "FAIL: composer.lock obrigatório no laboratório de QA." >&2
  exit 2
fi
composer install --no-interaction --prefer-dist --no-progress --no-plugins --no-scripts
composer validate --strict

echo "[QA] Rotas privadas registradas (não implica acesso liberado)."
php artisan route:list --path=universidade/private --except-vendor

echo "[QA] Suites de testes Laravel em SQLite efêmero."
vendor/bin/phpunit --testsuite Unit
vendor/bin/phpunit --testsuite Feature

echo "[QA] Apenas PostgreSQL 18 sintético em 127.0.0.1:5432."
php artisan migrate:fresh --database=pgsql --force
php artisan migrate:status --database=pgsql
php scripts/check-pg-schema.php
php scripts/check-pg-flow.php
php scripts/check-pg-nonce.php

# Fixture only, inside APP_ENV=testing and the disposable PostgreSQL database.
first=$(php artisan university:load-synthetic-editorial --confirm-synthetic --no-interaction)
echo "$first" | grep -Fq '4 courses created; 11 lessons created; 0 courses preserved.'
second=$(php artisan university:load-synthetic-editorial --confirm-synthetic --no-interaction)
echo "$second" | grep -Fq '0 courses created; 0 lessons created; 4 courses preserved.'
echo "[QA] PASS: quatro cursos e onze aulas em rascunho, sem duplicar no segundo ensaio."

echo "[QA] Provider de autorização segue DENY-ALL."
grep -Fq "UnavailablePortalAuthority::class" app/Providers/AppServiceProvider.php

echo "[QA] PASS: laboratório concluído. NÃO significa autorização para deploy."
