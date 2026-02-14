FROM php:8.2-cli

WORKDIR /app

# Устанавливаем зависимости
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install zip

# Устанавливаем Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Копируем проект
COPY . .

# Устанавливаем PHP зависимости
RUN composer install --no-interaction --no-dev

# Открываем порт (Render сам передаст PORT)
EXPOSE 10000

# Запуск сервера
CMD ["php", "server.php"]
