# Dedicated disposable QA image. Never deploy this image in production.
FROM php@sha256:cdb77e306d6bb99db40e513fbe036ecc6c53b575cbcb7e581387845fef26d755

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    git unzip ca-certificates python3 nodejs libpq-dev libonig-dev libxml2-dev libsqlite3-dev libsodium-dev \
 && docker-php-ext-install -j"$(nproc)" \
    mbstring pdo_pgsql pdo_sqlite dom xml xmlwriter bcmath sodium \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer@sha256:50ea4d33fdcde1adb0f045547295faa1548b33872e5f789dae5b02ce2fb5de93 /usr/bin/composer /usr/local/bin/composer

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
COPY --chown=uniqa:uniqa composer.* phpunit.xml artisan ./
COPY --chown=uniqa:uniqa app/ ./app/
COPY --chown=uniqa:uniqa bootstrap/ ./bootstrap/
COPY --chown=uniqa:uniqa database/ ./database/
COPY --chown=uniqa:uniqa routes/ ./routes/
COPY --chown=uniqa:uniqa resources/views/ ./resources/views/
COPY --chown=uniqa:uniqa content/ ./content/
COPY --chown=uniqa:uniqa tests/ ./tests/
COPY --chown=uniqa:uniqa scripts/ ./scripts/
# The disposable SQL role-policy test needs this file; not shipped in production images.
COPY --chown=uniqa:uniqa ops/staging/role-grants-candidate.sql ./ops/staging/role-grants-candidate.sql
COPY --chown=uniqa:uniqa public/index.php ./public/index.php
COPY --chown=uniqa:uniqa public/assets/logo-imagine.png public/assets/imagine-tokens.css ./public/assets/

USER uniqa:uniqa

CMD ["bash", "scripts/qa-compose-entrypoint.sh"]
