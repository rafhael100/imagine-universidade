#!/usr/bin/env bash
set -euo pipefail

# Executar somente em sandbox aprovada, com banco inteiramente sintético.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f composer.json || ! -d app || ! -d tests ]]; then
  echo 'Falha: execute a partir da cópia de desenvolvimento da Universidade Imagine.' >&2
  exit 2
fi

if ! command -v php >/dev/null 2>&1; then
  echo 'PHP não instalado; validação interrompida.' >&2
  exit 2
fi

while IFS= read -r -d '' source; do
  php -l "$source" >/dev/null
done < <(find app bootstrap database routes tests scripts -type f -name '*.php' -print0)
echo '[PASS] Sintaxe PHP verificada'

# Contrato de acesso funciona também sem Composer e sem banco.
php scripts/check-access-domain.php
php scripts/check-portal-context.php
php scripts/check-provisioner-contract.php
echo '[PASS] Política de acesso em PHP puro'
php scripts/check-learning-mock.php
echo '[PASS] Progresso sintético em PHP puro'
php scripts/check-tenant-guard.php
echo '[PASS] Provisionamento nega grants inválidos em PHP puro'

if command -v python3 >/dev/null 2>&1; then
  python3 scripts/check-sqlite-contract.py
  echo '[PASS] Restrições SQLite e conflitos de progresso em memória'
else
  echo '[PENDENTE] Python3 indisponível para o smoke SQL; seguir apenas com testes PHP.' >&2
fi

if command -v node >/dev/null 2>&1; then
  node scripts/check-ui-contract.mjs
  node ops/staging/check-release-gates.mjs
  node scripts/check-release-gate-policy.mjs
  echo '[PASS] Contratos de UI/rotas/catálogo em Node'
else
  echo '[PENDENTE] Node não instalado; contrato estático de UI não executado.' >&2
fi

if ! command -v composer >/dev/null 2>&1; then
  echo '[PENDENTE] Composer não instalado; testes Laravel não foram executados.' >&2
  exit 2
fi
if [[ -f composer.lock ]]; then
  composer validate --strict
  echo '[PASS] Composer e lockfile verificados'
else
  # Sem lockfile é permitido apenas diagnóstico exploratório na sandbox.
  composer validate --no-check-publish
  echo '[ATENÇÃO] composer.lock ausente: dependências NÃO são reprodutíveis para release.' >&2
fi

if [[ ! -f vendor/autoload.php || ! -x vendor/bin/phpunit ]]; then
  echo '[PENDENTE] Dependências não instaladas; não instalar automaticamente.' >&2
  exit 2
fi

if ! php -r 'exit(extension_loaded("pdo_sqlite") ? 0 : 1);'; then
  echo '[PENDENTE] pdo_sqlite necessário para suíte Feature sintética.' >&2
  exit 2
fi

vendor/bin/phpunit --testsuite Unit
vendor/bin/phpunit --testsuite Feature
echo '[PASS] Suites PHPUnit executadas; PostgreSQL real segue pendente de homologação.'
