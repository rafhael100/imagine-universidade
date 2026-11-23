# C-62: candidate image for manual approved private staging only.
FROM php@sha256:e4b1eec29a5be22428aa93fb43da75a0e39006e403da0c3e93631dde92f067df
# Remove compiler-only headers after compilation; keep runtime libraries.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libpq-dev libonig-dev libxml2-dev libsodium-dev unzip \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring dom xml bcmath sodium opcache \
 && apt-get purge -y linux-libc-dev libxml2-dev libpq-dev libonig-dev libsodium-dev libssl-dev \
      dpkg-dev libc-dev-bin libcrypt-dev libgcc-12-dev libnsl-dev libtirpc-dev icu-devtools \
 && installed_packages="$(dpkg-query -W -f='${Package}\t${db:Status-Status}\n')" \
 && for package in linux-libc-dev libxml2-dev libpq-dev libonig-dev libsodium-dev libssl-dev \
      dpkg-dev libc-dev-bin libcrypt-dev libgcc-12-dev libnsl-dev libtirpc-dev icu-devtools; do \
      printf '%s\n' "$installed_packages" | awk -F '\t' -v pkg="$package" '$1 == pkg && $2 == "installed" { found=1 } END { exit found ? 1 : 0 }' || exit 1; \
    done \
 && for package in libpq5 libonig5 libsodium23 libssl3 libxml2; do \
      test "$(dpkg-query -W -f='${db:Status-Status}' "$package")" = installed || exit 1; \
    done \
 && php -r 'foreach (["pdo_pgsql","mbstring","dom","xml","bcmath","sodium","Zend OPcache"] as $ext) { if (!extension_loaded($ext)) { fwrite(STDERR, "Missing runtime extension: ".$ext.PHP_EOL); exit(1); } }' \
 && php-fpm -t \
 && rm -rf /var/lib/apt/lists/*
COPY --from=composer@sha256:50ea4d33fdcde1adb0f045547295faa1548b33872e5f789dae5b02ce2fb5de93 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --no-plugins --no-autoloader
COPY artisan ./
COPY app/ ./app/
COPY bootstrap/ ./bootstrap/
COPY database/ ./database/
COPY routes/ ./routes/
COPY resources/views/ ./resources/views/
COPY public/ ./public/
RUN composer dump-autoload --no-dev --classmap-authoritative --no-scripts --no-plugins \
 && mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm","-F"]
