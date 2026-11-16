# C-62: candidate image for manual approved private staging only.
FROM php:8.4-fpm-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libpq-dev libonig-dev libxml2-dev libsodium-dev unzip \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql mbstring dom xml bcmath sodium opcache \
 && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
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
