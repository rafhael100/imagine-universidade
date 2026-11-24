# C-62: candidate image for manual approved private staging only.
FROM php@sha256:495ab94788034640ddd6fb313476e75570261622c42704e5ae02047b8d934ea0
# Debian 13 candidate: keep the same PHP 8.4 line; no mixed apt suites.
# Remove compiler-only headers after compilation; keep runtime libraries.
RUN . /etc/os-release && test "$ID" = debian && test "$VERSION_CODENAME" = trixie \
 && apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libpq-dev libonig-dev libxml2-dev libsodium-dev unzip \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring dom xml bcmath sodium opcache \
 && dev_packages='linux-libc-dev libxml2-dev libpq-dev libonig-dev libsodium-dev libssl-dev dpkg-dev libc-dev-bin libcrypt-dev libgcc-14-dev libnsl-dev libtirpc-dev icu-devtools' \
 && installed_packages="$(dpkg-query -W -f='${Package}\t${db:Status-Status}\n')" \
 && purge_packages="$(printf '%s\n' "$installed_packages" | awk -F '\t' -v list="$dev_packages" 'BEGIN { n=split(list,a," "); for(i=1;i<=n;i++) wanted[a[i]]=1 } $2=="installed" && $1 in wanted { print $1 }')" \
 && test -n "$purge_packages" \
 && apt-get purge -y $purge_packages \
 && installed_packages="$(dpkg-query -W -f='${Package}\t${db:Status-Status}\n')" \
 && for package in $dev_packages; do \
      printf '%s\n' "$installed_packages" | awk -F '\t' -v pkg="$package" '$1 == pkg && $2 == "installed" { found=1 } END { exit found ? 1 : 0 }' || exit 1; \
    done \
 && for package in libpq5 libonig5 libsodium23 libssl3t64 libxml2 libsqlite3-0; do \
      test "$(dpkg-query -W -f='${db:Status-Status}' "$package")" = installed || exit 1; \
    done \
 && php -r 'foreach (["pdo_pgsql","mbstring","dom","xml","bcmath","sodium","Zend OPcache"] as $ext) { if (!extension_loaded($ext)) { fwrite(STDERR, "Missing runtime extension: ".$ext.PHP_EOL); exit(1); } }' \
 && php -r 'if (!extension_loaded("sqlite3") || !extension_loaded("pdo_sqlite") || version_compare(SQLite3::version()["versionString"], "3.42.0", "<")) { fwrite(STDERR, "SQLite runtime below review floor".PHP_EOL); exit(1); }' \
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
