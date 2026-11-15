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
done < <(find app bootstrap database routes tests -type f -name '*.php' -print0)
echo '[PASS] Sintaxe PHP verificada'

# Contrato de acesso funciona também sem Composer e sem banco.
php scripts/check-access-domain.php
echo '[PASS] Política de acesso em PHP puro'
php scripts/check-learning-mock.php
echo '[PASS] Progresso sintético em PHP puro'

if ! command -v composer >/dev/null 2>&1; then
  echo '[PENDENTE] Composer não instalado; testes Laravel não foram executados.' >&2
  exit 2
fi
composer validate --strict

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
