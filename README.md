# REDLINE CLUB

Telegram-бот и Mini App для мультигруппового автомобильного маркетплейса.

- Mini App: `https://poznaysebya.site/redlineclub/`
- API: `https://poznaysebya.site/redlineclub-api/`
- Telegram: long polling (`getUpdates`), без webhook
- Backend: Java 21, Spring Boot и локальная База данных
- Развёртывание: один Docker-образ и один контейнер

Все настройки передаются непосредственно через `-e` в `docker run`.
Файлы `.env` и `--env-file` не используются.

## 1. Собрать и запустить

Выполните из корня проекта, где находится `Dockerfile`:

```bash
docker volume create redline-bot-data
docker build -t redline-bot:1.0 .
```

Перед запуском получите новый токен через BotFather. Не добавляйте токен в
Dockerfile, Git или текстовые файлы.

```bash
docker run -d \
  --name redline-bot \
  --restart unless-stopped \
  -p 127.0.0.1:18080:8080 \
  -v redline-bot-data:/data \
  -e PORT='8080' \
  -e TELEGRAM_BOT_TOKEN='НОВЫЙ_ТОКЕН_ОТ_BOTFATHER' \
  -e TELEGRAM_POLLING_TIMEOUT_SECONDS='50' \
  -e MINI_APP_URL='https://poznaysebya.site/redlineclub/' \
  -e SUPER_ADMIN_TELEGRAM_ID='726773708' \
  -e BOT_COMMISSION_PERCENT='5.0' \
  -e DEBT_LIMIT_KOPECKS='50000' \
  -e DATABASE_URL='jdbc:sqlite:/data/redline.db' \
  -e UPLOAD_DIR='/data/uploads' \
  -e PUBLIC_API_URL='https://poznaysebya.site/redlineclub-api/' \
  redline-bot:1.0
```

Контейнер одновременно запускает:

- Mini App на внутреннем порту `3000`;
- Spring Boot API и long polling на внутреннем порту `18081`;
- единый внутренний шлюз на порту `8080`.

Наружу публикуется только `127.0.0.1:18080`.
Отдельный контейнер Mini App, PostgreSQL и Docker-сеть не нужны.

`DEBT_LIMIT_KOPECKS='50000'` означает 500 рублей.

Проверка:

```bash
docker logs --tail 150 redline-bot
curl -s http://127.0.0.1:18080/actuator/health
curl -I http://127.0.0.1:18080/redlineclub/
docker exec redline-bot ls -lh /data/redline.db
docker exec redline-bot ls -ld /data/uploads
```

При старте приложение подготавливает таблицы Базы данных,
удаляет прежний webhook и запускает `getUpdates`.

Новая база не содержит демонстрационных пользователей, групп, категорий или
товаров. Пользователь регистрируется при первом входе. Группа появляется только
после добавления бота администратором с правом управления темами. Категории
создаёт супер-администратор в Mini App.

Запускайте только один экземпляр контейнера с данным токеном: Telegram не
разрешает параллельный long polling для одного бота.

## 2. Полный nginx-конфиг

Сначала перенесите резервную копию за пределы `sites-enabled`:

```bash
sudo mv /etc/nginx/sites-enabled/poznaysebya.site.backup \
  /root/poznaysebya.site.backup
```

Файл `/etc/nginx/sites-enabled/poznaysebya.site`:

```nginx
server {
    server_name poznaysebya.site www.poznaysebya.site;

    location = /ascendlab {
        return 301 /ascendlab/;
    }

    location /ascendlab/ {
        proxy_pass http://127.0.0.1:8089;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_buffering off;
        proxy_read_timeout 300;
        client_max_body_size 24m;
    }

    location = /redlineclub {
        return 308 /redlineclub/;
    }

    location ^~ /redlineclub/ {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location ^~ /redlineclub-api/ {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 20m;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/poznaysebya.site/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/poznaysebya.site/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.poznaysebya.site) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = poznaysebya.site) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name poznaysebya.site www.poznaysebya.site;

    return 404; # managed by Certbot
}
```

Проверить и применить:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Не выполняйте `reload`, если `nginx -t` завершился с ошибкой.

Проверка снаружи:

```bash
curl -I https://poznaysebya.site/redlineclub/
curl -s https://poznaysebya.site/redlineclub-api/actuator/health
```

## 3. Настроить BotFather

1. `/revoke` — отозвать ранее опубликованный токен.
2. `/setdomain` → выбрать бота → `poznaysebya.site`.
3. `/setmenubutton` → выбрать бота.
4. Текст: `Открыть REDLINE CLUB`.
5. URL: `https://poznaysebya.site/redlineclub/`.

Webhook настраивать не нужно.

## 4. Обновление без потери Базы данных

```bash
docker rm -f redline-bot
docker build -t redline-bot:1.1 .
```

Повторите `docker run` с новым тегом. Не удаляйте volume
`redline-bot-data`: в нём находится база.

Резервная копия:

```bash
docker run --rm \
  -v redline-bot-data:/data:ro \
  -v "$PWD":/backup \
  alpine:3.21 \
  cp /data/redline.db /backup/redline-$(date +%F-%H%M).db
```

## API и безопасность

Mini App передаёт `Telegram.WebApp.initData` в заголовке
`X-Telegram-Init-Data`. Backend проверяет HMAC-подпись и срок действия.

Оплата товаров и комиссий выполняется напрямую между участниками. Площадка
хранит статусы сделок и бухгалтерский счётчик комиссионного долга.
