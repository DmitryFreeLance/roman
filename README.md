# REDLINE CLUB

Telegram-бот и Mini App для мультигруппового автомобильного маркетплейса.

- Mini App: `https://poznaysebya.site/redlineclub`
- Bot API через nginx: `https://poznaysebya.site/redlineclub-api/`
- Telegram: long polling (`getUpdates`), без webhook
- Backend: Java 21, Spring Boot, PostgreSQL, Flyway

## 1. Подготовить Docker-сеть и PostgreSQL

Все переменные передаются непосредственно через `-e`. Файлы `.env` и
`--env-file` не используются.

Создайте отдельную сеть и volume:

```bash
docker network create redline-net
docker volume create redline-postgres-data
```

Запустите PostgreSQL. Обязательно замените пароль:

```bash
docker run -d \
  --name redline-postgres \
  --restart unless-stopped \
  --network redline-net \
  -e POSTGRES_DB='redline' \
  -e POSTGRES_USER='redline' \
  -e POSTGRES_PASSWORD='ЗАМЕНИТЕ_НА_СЛОЖНЫЙ_ПАРОЛЬ' \
  -v redline-postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

Проверка:

```bash
docker exec redline-postgres pg_isready -U redline -d redline
```

## 2. Собрать и запустить Mini App

Из корня проекта:

```bash
docker build -f Dockerfile.miniapp -t redline-miniapp:1.0 .
```

Контейнер доступен только локальному nginx:

```bash
docker run -d \
  --name redline-miniapp \
  --restart unless-stopped \
  -p 127.0.0.1:13000:3000 \
  -e NODE_ENV='production' \
  redline-miniapp:1.0
```

Проверка до настройки nginx:

```bash
curl -I http://127.0.0.1:13000/redlineclub/
```

## 3. Собрать и запустить бота

Сборка:

```bash
docker build -t redline-bot:1.0 ./bot
```

Запуск. Замените токен, Telegram ID и пароль БД:

```bash
docker run -d \
  --name redline-bot \
  --restart unless-stopped \
  --network redline-net \
  -p 127.0.0.1:18080:8080 \
  -e PORT='8080' \
  -e TELEGRAM_BOT_TOKEN='123456789:ТОКЕН_ОТ_BOTFATHER' \
  -e TELEGRAM_POLLING_TIMEOUT_SECONDS='50' \
  -e MINI_APP_URL='https://poznaysebya.site/redlineclub/' \
  -e SUPER_ADMIN_TELEGRAM_ID='ВАШ_TELEGRAM_ID' \
  -e BOT_COMMISSION_PERCENT='5.0' \
  -e DEBT_LIMIT_KOPECKS='50000' \
  -e DATABASE_URL='jdbc:postgresql://redline-postgres:5432/redline' \
  -e DATABASE_USER='redline' \
  -e DATABASE_PASSWORD='ТОТ_ЖЕ_СЛОЖНЫЙ_ПАРОЛЬ' \
  redline-bot:1.0
```

`DEBT_LIMIT_KOPECKS='50000'` означает 500 рублей.

Проверка:

```bash
docker logs --tail 100 redline-bot
curl -s http://127.0.0.1:18080/actuator/health
```

При старте бот выполняет `deleteWebhook`, а затем постоянно вызывает
`getUpdates` с long polling. Публичный URL для получения обновлений Telegram
не нужен. Запускайте только один экземпляр контейнера `redline-bot`: Telegram
не допускает параллельный `getUpdates` для одного токена.

## 4. Точно добавить `/redlineclub` в nginx

### 4.1. Найти конфиг именно нужного домена

Не создавайте новый `server` с тем же доменом. Сначала найдите существующий:

```bash
sudo grep -Rns \
  'server_name.*poznaysebya\.site' \
  /etc/nginx/sites-enabled /etc/nginx/conf.d
```

Команда покажет точный файл, например:

```text
/etc/nginx/sites-enabled/poznaysebya.site.conf:12: server_name poznaysebya.site;
```

Проверьте, что это HTTPS-блок с `listen 443 ssl`:

```bash
sudo nginx -T | less
```

В выводе найдите `server_name poznaysebya.site`. Изменять нужно только этот
`server { ... }`. Блок `/ascendlab` оставьте как есть.

Если найденный файл является символической ссылкой из `sites-enabled`, узнайте
реальный файл и дальше редактируйте его:

```bash
sudo readlink -f /etc/nginx/sites-enabled/poznaysebya.site.conf
```

### 4.2. Сделать резервную копию

Подставьте путь, найденный на предыдущем шаге:

```bash
sudo cp /etc/nginx/sites-enabled/poznaysebya.site.conf \
  /etc/nginx/sites-enabled/poznaysebya.site.conf.backup
```

### 4.3. Добавить три location

Откройте найденный файл:

```bash
sudo nano /etc/nginx/sites-enabled/poznaysebya.site.conf
```

Вставьте содержимое
`deploy/nginx-redlineclub.conf.example` **внутрь существующего HTTPS
`server { ... }`**, рядом с уже существующим `location /ascendlab/`.

Ключевые правила:

1. Не вставлять новый `server {}`.
2. Не менять существующий `location /ascendlab/`.
3. Для Mini App оставить
   `proxy_pass http://127.0.0.1:13000;` **без** `/` в конце.
4. Для API оставить
   `proxy_pass http://127.0.0.1:18080/;` **с** `/` в конце.

### 4.4. Проверить и применить

```bash
sudo nginx -t
```

Если вывод содержит `syntax is ok` и `test is successful`:

```bash
sudo systemctl reload nginx
```

Если проверка не прошла — не перезагружайте nginx, восстановите backup.

### 4.5. Проверить снаружи

```bash
curl -I https://poznaysebya.site/redlineclub
curl -I https://poznaysebya.site/redlineclub/
curl -s https://poznaysebya.site/redlineclub-api/actuator/health
```

Ожидается:

- первый запрос: `308` на `/redlineclub/`;
- второй: `200`;
- health: JSON со статусом `UP`.

## 5. Настроить BotFather

В диалоге с `@BotFather`:

1. `/setdomain` → выбрать бота → `poznaysebya.site`.
2. `/setmenubutton` → выбрать бота.
3. Текст кнопки: `Открыть REDLINE CLUB`.
4. URL: `https://poznaysebya.site/redlineclub/`.

Webhook настраивать не нужно. Если он был установлен раньше, бот удалит его
сам при первом запуске long polling.

## 6. Обновление контейнеров

После получения новой версии кода:

```bash
docker rm -f redline-miniapp redline-bot
docker build -f Dockerfile.miniapp -t redline-miniapp:1.1 .
docker build -t redline-bot:1.1 ./bot
```

Затем повторите команды `docker run` выше с новыми тегами. PostgreSQL удалять
не нужно: данные остаются в `redline-postgres-data`.

## API и безопасность

Mini App передаёт оригинальную строку `Telegram.WebApp.initData` в заголовке
`X-Telegram-Init-Data`. Backend проверяет HMAC-подпись и срок действия.

Оплата товаров и комиссий выполняется напрямую между участниками. Площадка
хранит только статусы сделок и бухгалтерский счётчик комиссионного долга.
