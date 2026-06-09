# Деплой NEXORA на Render (бесплатно)

## Что понадобится

- Аккаунт на [render.com](https://render.com)
- Репозиторий на GitHub (залейте проект)

## Быстрый способ — Blueprint

1. Зайдите в Render → **New** → **Blueprint**
2. Подключите репозиторий `nexora`
3. Render подхватит `render.yaml` из корня
4. Задайте секреты при создании:
   - `ADMIN_PASSWORD` — пароль админа
   - `CORS_ORIGIN` — URL фронта, например `https://nexora-web.onrender.com`
   - `NEXT_PUBLIC_API_URL` — URL API, например `https://nexora-api.onrender.com`
   - `NEXT_PUBLIC_WS_URL` — тот же URL API (для чата)

## Ручной деплой API

1. **New Web Service** → подключите репозиторий
2. **Root Directory:** `apps/api`
3. **Build:** `npm install && npx prisma generate && npm run build`
4. **Start:** `npx prisma db push && node dist/main.js`
5. **Disk** (важно для SQLite): 1 GB, mount `apps/api/prisma`
6. Переменные окружения:

| Переменная | Значение |
|------------|----------|
| `PORT` | `4000` |
| `DATABASE_URL` | `file:./dev.db` |
| `JWT_SECRET` | случайная строка 32+ символов |
| `JWT_REFRESH_SECRET` | другая случайная строка |
| `CORS_ORIGIN` | URL вашего фронта |
| `ADMIN_EMAIL` | `admin@nexora.io` |
| `ADMIN_PASSWORD` | ваш пароль |

## Ручной деплой Web (Next.js)

1. **New Web Service** → тот же репозиторий
2. **Root Directory:** `apps/web`
3. **Build:** из корня монорепо:
   ```bash
   cd ../.. && npm install && npm run build --workspace=@nexora/shared && npm run build --workspace=@nexora/web
   ```
4. **Start:** `npm run start`
5. Переменные:

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_API_URL` | `https://ВАШ-API.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `https://ВАШ-API.onrender.com` |

## После деплоя

1. Откройте API: `https://ваш-api.onrender.com/api`
2. Зарегистрируйтесь или войдите как админ
3. Друг из другого города открывает URL фронта

## Ограничения free tier

- Сервис «засыпает» после 15 мин без трафика (первый запрос ~30–60 сек)
- SQLite на диске — данные сохраняются, но бэкапы делайте вручную
- Для серьёзной игры лучше PostgreSQL (Render Postgres или Neon) — можно мигрировать позже

## LAN / локально с другом

Если не хотите хостинг пока:

```bash
npm run dev:api   # API на 0.0.0.0:4000
npm run dev:web   # Web на 0.0.0.0:3000
```

В `.env` web: `NEXT_PUBLIC_API_URL=http://ВАШ_IP:4000`

Друг в той же сети: `http://ВАШ_IP:3000`

Для друга из другого города — **Cloudflare Tunnel** (бесплатно):

```bash
cloudflared tunnel --url http://localhost:3000
```
