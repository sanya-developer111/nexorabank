# NEXORA — GitHub + Render (быстрый деплой)

Пошаговая инструкция: залить проект на GitHub и выкатить в интернет через [Render](https://render.com).  
HTTPS включён автоматически — QR-оплата с камерой на телефоне будет работать.

**Время:** ~15–20 минут при первом разе.

---

## Что получится в итоге

| Сервис | URL (пример) |
|--------|----------------|
| Сайт (игра) | `https://nexora-web.onrender.com` |
| API | `https://nexora-api.onrender.com/api` |

Оба адреса публичные — можно играть с телефона, отправить ссылку другу.

---

## Что нужно заранее

1. Аккаунт на [github.com](https://github.com)
2. Аккаунт на [render.com](https://render.com) (можно войти через GitHub)
3. **Git** на компьютере — [git-scm.com](https://git-scm.com/download/win)  
   Проверка в CMD: `git --version`

---

## Шаг 1. Подготовить проект

Открой CMD в папке проекта:

```cmd
cd C:\Users\mrsas\Projects\nexora
```

### Не заливайте секреты

В репозиторий **не должны** попасть:

- `apps/api/.env`
- `apps/web/.env.local`
- пароли, JWT-ключи

Они уже в `.gitignore` — не удаляйте эту строку из игнора.

### (Рекомендуется) Проверка локально

```cmd
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Сайт: http://localhost:3000  
API: http://localhost:4000/api  

Если локально всё ок — на Render тоже соберётся.

---

## Шаг 2. Залить на GitHub

### Вариант A — через сайт GitHub (самый простой)

1. Открой [github.com/new](https://github.com/new)
2. **Repository name:** `nexora` (или любое имя)
3. **Private** или **Public** — на ваш выбор
4. **Не** ставьте галочки «Add README» / «Add .gitignore» — репозиторий должен быть пустым
5. Нажмите **Create repository**

6. В CMD (подставьте свой логин вместо `ВАШ_ЛОГИН`):

```cmd
cd C:\Users\mrsas\Projects\nexora
git init
git add .
git commit -m "Initial commit: NEXORA"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/nexora.git
git push -u origin main
```

При первом `git push` GitHub попросит войти (браузер или токен).

### Вариант B — репозиторий уже есть

```cmd
cd C:\Users\mrsas\Projects\nexora
git add .
git commit -m "Обновление NEXORA"
git push
```

### Обновления после изменений в коде

```cmd
git add .
git commit -m "Описание изменений"
git push
```

Render сам пересоберёт сайт после каждого `push` в `main`.

---

## Шаг 3. Деплой на Render (Blueprint — один клик)

В проекте уже есть файл `render.yaml` — Render создаст **два** сервиса: API и сайт.

1. Войдите на [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Blueprint**
3. Подключите GitHub (если ещё не подключён) → выберите репозиторий `nexora`
4. Render покажет план из `render.yaml` → **Apply**

Дождитесь статуса **Live** у обоих сервисов (`nexora-api` и `nexora-web`). Первая сборка может занять 5–10 минут.

---

## Шаг 4. Обязательно: поправить URL с `https://`

Render в Blueprint подставляет только **имя хоста** без `https://`. Для браузера и CORS нужны полные адреса.

Откройте в Dashboard каждый сервис и вкладку **Environment**.

### Сервис `nexora-web`

| Переменная | Значение (подставьте свои URL из Render) |
|------------|---------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://nexora-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `https://nexora-api.onrender.com` |

Сохраните → Render пересоберёт веб (1–3 мин).

### Сервис `nexora-api`

| Переменная | Значение |
|------------|----------|
| `WEB_URL` | `https://nexora-web.onrender.com` |
| `CORS_ORIGINS` | `https://nexora-web.onrender.com` |
| `JWT_SECRET` | длинная случайная строка (если пусто — сгенерируйте в Render) |
| `JWT_REFRESH_SECRET` | ещё одна случайная строка |
| `ADMIN_EMAIL` | email админа (по желанию) |
| `ADMIN_PASSWORD` | надёжный пароль админа (по желанию) |

Сохраните → API перезапустится.

> URL смотрите в шапке каждого сервиса в Render (кнопка **Copy** рядом с адресом).

---

## Шаг 5. Первый запуск: админ и данные

При старте API выполняется `prisma db push` — таблицы создаются автоматически.

### Создать админа и стартовые данные (один раз)

1. Render → сервис **nexora-api** → **Shell**
2. Выполните:

```bash
cd apps/api && npm run db:seed
```

3. Дождитесь `Seeding NEXORA database...`

По умолчанию (если не задавали `ADMIN_EMAIL` / `ADMIN_PASSWORD`):

- Email: `admin@nexora.io`
- Пароль: `NexoraAdmin2026!`

**Сразу смените пароль** после первого входа или задайте свои значения в Environment до запуска seed.

Админ-панель: `https://ваш-сайт.onrender.com/admin`

---

## Шаг 6. Проверка

1. Откройте URL **nexora-web** — должна загрузиться игра
2. Зарегистрируйте пользователя или войдите как админ
3. Кошелёк → **QR-оплата** — камера должна работать (сайт на HTTPS)
4. Если ошибки в консоли браузера (F12) про CORS — проверьте шаг 4

Прямая проверка API:

```
https://nexora-api.onrender.com/api
```

(может ответить 404 на корне — это нормально, префикс `/api` у NestJS)

---

## Как это устроено

```
GitHub (main)
    ↓ push
Render Blueprint (render.yaml)
    ├── nexora-api   — NestJS, Prisma, SQLite (prod.db)
    └── nexora-web   — Next.js
```

- **HTTPS** — бесплатно на всех `*.onrender.com`
- **Автодеплой** — каждый `git push` в ветку, с которой связан Render
- **Порты** — Render сам задаёт `PORT`; API слушает `0.0.0.0`

---

## Бесплатный план Render — ограничения

| Особенность | Что это значит |
|-------------|----------------|
| Засыпание | После ~15 мин без запросов сервис спит; первый заход — пауза 30–60 сек |
| SQLite без Disk | База `file:./prod.db` во временной ФС; при редеплое данные могут обнулиться. **Disk на Free нельзя** |
| Два сервиса | API и Web — два отдельных «засыпания» |

Для долгой игры с друзьями позже можно перейти на **PostgreSQL** в Render (платный диск / БД). Для теста и демо бесплатного плана достаточно.

---

## Частые проблемы

### `disks are not supported for free tier services`

Render **не даёт** постоянный диск на бесплатном плане. Если в `render.yaml` есть блок `disk:` у сервиса — Blueprint упадёт с этой ошибкой.

**Что сделать:**

1. Откройте `render.yaml` в репозитории на GitHub
2. Удалите весь блок `disk:` (если он есть), например:
   ```yaml
   disk:
     name: nexora-data
     mountPath: ...
     sizeGB: 1
   ```
3. Оставьте `plan: free` и `DATABASE_URL=file:./prod.db` — этого достаточно для старта
4. Закоммитьте и снова **Apply** Blueprint (или `git push`, если сервисы уже созданы)

Без диска база работает, но при **редеплое** аккаунты могут пропасть — для демо это нормально. Постоянные данные — платный Disk на Render или внешняя PostgreSQL (Neon).

### Сайт открывается, но логин/API не работает

- Проверьте `NEXT_PUBLIC_API_URL` — должен быть `https://...` **без** `/api` в конце
- После смены переменных дождитесь пересборки **nexora-web**

### CORS / «blocked by CORS policy»

- В **nexora-api** должно быть:  
  `CORS_ORIGINS=https://nexora-web.onrender.com`  
  (точный URL сайта, с `https://`, без слэша в конце)

### `Cannot find module .../dist/main.js`

Сборка прошла, но стартовая команда ищет файл не там. Исправление в репозитории: `rootDir: "./src"` в `apps/api/tsconfig.json` и старт `node dist/main`.

В Render → **nexora-api** → **Start Command** должно быть:

```bash
cd apps/api && npx prisma db push && node dist/main
```

Не `dist/apps/api/src/main.js` и не `dist/main.js` со старым tsconfig.

### API падает при старте

- **Logs** → nexora-api → смотрите ошибку Prisma
- Убедитесь, что `DATABASE_URL=file:./prod.db`

### Сборка падает на `npm install`

- Проверьте, что в репозитории есть `package-lock.json`
- Локально: `npm install` и снова `git push`

### Забыли пароль админа

- Задайте новый `ADMIN_PASSWORD` в Environment API
- Shell: `cd apps/api && npm run db:seed` (обновит админа через upsert)

---

## Ручной деплой (если Blueprint не подходит)

Создайте **два** Web Service вручную из того же репозитория.

### nexora-api

| Поле | Значение |
|------|----------|
| Root Directory | *(пусто — корень репо)* |
| Build Command | `npm install && npm run build --workspace=@nexora/shared && cd apps/api && npx prisma generate && npm run build` |
| Start Command | `cd apps/api && npx prisma db push && node dist/main` |
| Instance type | Free |

Environment — как в шаге 4 для API + `DATABASE_URL=file:./prod.db`, `NODE_ENV=production`.

### nexora-web

| Поле | Значение |
|------|----------|
| Build Command | `npm install && npm run build --workspace=@nexora/shared && cd apps/web && npm run build` |
| Start Command | `cd apps/web && npm run start -- -p $PORT` |

Environment — `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_WS_URL` как в шаге 4.

---

## Локальная разработка (Windows CMD)

```cmd
cd C:\Users\mrsas\Projects\nexora
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

| | Адрес |
|---|--------|
| Сайт | http://localhost:3000 |
| API | http://localhost:4000/api |

Доступ по Wi‑Fi с телефона: см. `apps/web/.env.local` и `apps/api/.env` (IP + CORS). Камера по IP без HTTPS не работает — на Render с HTTPS работает.

---

## Краткий чеклист

- [ ] Проект на GitHub (`git push`)
- [ ] Render Blueprint из `render.yaml`
- [ ] `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` с `https://`
- [ ] `WEB_URL` / `CORS_ORIGINS` с `https://`
- [ ] `npm run db:seed` в Shell API (один раз)
- [ ] Сменить пароль админа
- [ ] Открыть сайт и проверить вход + кошелёк

Готово — можно делиться ссылкой `https://nexora-web.onrender.com` с друзьями.
