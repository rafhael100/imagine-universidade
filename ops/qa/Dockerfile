# Dedicated disposable QA image. Never deploy this image in production.
FROM php:8.4-cli-bookworm

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    git unzip ca-certificates python3 nodejs libpq-dev libonig-dev libxml2-dev \
 && docker-php-ext-install -j"$(nproc)" \
    mbstring pdo_pgsql pdo_sqlite dom xml xmlwriter bcmath \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN useradd --uid 10001 --create-home --shell /bin/bash uniqa \
 && mkdir -p /work/universidade/bootstrap/cache \
    /work/universidade/storage/framework/cache/data \
    /work/universidade/storage/framework/sessions \
    /work/universidade/storage/framework/views \
    /work/universidade/storage/logs \
 && chown -R uniqa:uniqa /work/universidade

WORKDIR /work/universidade

# Allowlist files only: exclude .env, .git, local secrets, production data,
# preview and files outside the development source/test tree.
COPY --chown=uniqa:uniqa composer.json phpunit.xml artisan ./
COPY --chown=uniqa:uniqa app/ ./app/
COPY --chown=uniqa:uniqa bootstrap/ ./bootstrap/
COPY --chown=uniqa:uniqa database/ ./database/
COPY --chown=uniqa:uniqa routes/ ./routes/
COPY --chown=uniqa:uniqa resources/views/ ./resources/views/
COPY --chown=uniqa:uniqa content/ ./content/
COPY --chown=uniqa:uniqa tests/ ./tests/
COPY --chown=uniqa:uniqa scripts/ ./scripts/
COPY --chown=uniqa:uniqa public/index.php ./public/index.php

USER uniqa:uniqa

CMD ["bash", "scripts/qa-compose-entrypoint.sh"]
