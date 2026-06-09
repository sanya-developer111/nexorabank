# NEXORA — Digital Financial Universe

> Премиальная цифровая финансовая экосистема нового поколения

![NEXORA](https://img.shields.io/badge/Currency-Nexium_%E2%97%88-cyan)
![Stack](https://img.shields.io/badge/Stack-Next.js_|_NestJS_|_PostgreSQL-purple)

## Концепция

**NEXORA** — это не банк. Это цифровая вселенная, объединяющая:

- 🏦 **Цифровой банк** — счета, переводы, накопления, кэшбек
- 🎮 **Экономическую MMORPG** — уровни, ранги, престиж, Battle Pass
- 📈 **Инвестиционную платформу** — акции, индексы, крипто, Nexora-активы
- 👥 **Социальную сеть** — друзья, чат, кланы, корпорации
- 🛒 **Торговую площадку** — магазин, маркетплейс, аукционы
- 🏆 **Систему достижений** — квесты, турниры, сезоны

## Валюта Nexium (NEX ◈)

| Параметр | Значение |
|----------|----------|
| Название | Nexium |
| Символ | NEX ◈ |
| Макс. эмиссия | 1,000,000,000 NEX |
| Происхождение | Кристаллизация цифровой ценности в квантовых mesh-сетях (2047) |
| Механики | Инфляция, дефляция, сжигание, сезонные события |

## Архитектура

```
nexora/
├── apps/
│   ├── api/          # NestJS REST API + WebSocket
│   └── web/          # Next.js 14 App Router
├── packages/
│   └── shared/       # Общие типы и экономика
└── docker-compose.yml
```

### Технологии

| Слой | Стек |
|------|------|
| Frontend | React, Next.js, TypeScript, TailwindCSS, Framer Motion, Recharts |
| Backend | Node.js, NestJS, JWT, Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Infra | Docker |

## Быстрый старт

### 1. Инфраструктура

```bash
docker compose up -d
```

### 2. Установка

```bash
npm install
cp .env.example apps/api/.env
```

### 3. База данных

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Запуск

```bash
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000/api
- **Admin:** http://localhost:3000/admin

### Учётные данные администратора

- Email: `admin@nexora.io`
- Password: `NexoraAdmin2026!`

## Модули платформы

### Финансы
- 5 типов счетов (MAIN, SAVINGS, INVESTMENT, BUSINESS, ESCROW)
- Внутренние переводы с антифродом
- Кэшбек и бонусы за активность
- История транзакций

### Заработок
- Ежедневные и еженедельные квесты
- Серия входов (login streak)
- Колесо удачи (3 спина/день)
- Кейсы (100 NEX) и сундуки (250 NEX)
- Виртуальные бизнесы
- Контракты
- Реферальная система
- Турниры

### Инвестиции
- Акции, индексы, крипто, Nexora-активы
- Живые графики цен (обновление каждые 30 сек)
- Портфель и аналитика

### Социальное
- Профили, друзья, ЛС
- Глобальный чат (WebSocket)
- Кланы и корпорации
- Экономические войны

### Игровое
- Уровни, XP, 8 рангов, престиж
- Battle Pass по сезонам
- Достижения и коллекции
- Premium-подписка NEXORA+

### Админ-панель
- Управление пользователями и экономикой
- События, квесты, рынок
- Логи и антифрод
- Роли: USER → MODERATOR → ADMIN → SUPER_ADMIN

## API Endpoints

| Prefix | Описание |
|--------|----------|
| `/api/auth` | Регистрация, вход, 2FA, refresh |
| `/api/wallet` | Счета, переводы, история |
| `/api/quests` | Квесты и награды |
| `/api/investments` | Рынок и портфель |
| `/api/marketplace` | Торговая площадка |
| `/api/games` | Колесо, кейсы, сундуки |
| `/api/social` | Друзья, кланы, корпорации |
| `/api/admin` | Администрирование |

## Безопасность

- JWT + Refresh tokens
- Двухфакторная аутентификация (TOTP)
- Rate limiting
- Антифрод-система
- Логирование всех действий
- Защита транзакций

## Лицензия

Proprietary — NEXORA Digital Financial Universe © 2047
"# nexora" 
