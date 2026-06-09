/** Русские подписи для значений с бэкенда */
export const RANK_LABELS: Record<string, string> = {
  INITIATE: 'Новичок',
  EXPLORER: 'Исследователь',
  TRADER: 'Трейдер',
  INVESTOR: 'Инвестор',
  TYCOON: 'Магнат',
  MAGNATE: 'Олигарх',
  LEGEND: 'Легенда',
  SOVEREIGN: 'Властелин',
};

export const ACCOUNT_LABELS: Record<string, string> = {
  MAIN: 'Основной',
  SAVINGS: 'Накопительный',
  INVESTMENT: 'Инвестиционный',
  BUSINESS: 'Бизнес',
  ESCROW: 'Эскроу',
};

export const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Завершено',
  PENDING: 'Ожидание',
  ACCEPTED: 'Принято',
  OPEN: 'Открыт',
  ACTIVE: 'Активен',
  UPCOMING: 'Скоро',
  ENDED: 'Завершён',
  INACTIVE: 'Неактивен',
};

export const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Обычный',
  UNCOMMON: 'Необычный',
  RARE: 'Редкий',
  EPIC: 'Эпический',
  LEGENDARY: 'Легендарный',
};

export const CASE_LABELS: Record<string, string> = {
  standard: 'Стандартный',
  premium: 'Премиум',
  legendary: 'Легендарный',
  bronze: 'Бронзовый',
  silver: 'Серебряный',
  gold: 'Золотой',
};

export const BUSINESS_LABELS: Record<string, string> = {
  CAFE: 'Кафе',
  TECH: 'Технологии',
  MINING: 'Добыча',
  TRADING: 'Торговля',
  REAL_ESTATE: 'Недвижимость',
  ENTERTAINMENT: 'Развлечения',
};

const API_ERRORS: Record<string, string> = {
  Unauthorized: 'Не авторизован',
  'Request failed': 'Запрос не выполнен',
  'Invalid credentials': 'Неверный email или пароль',
  'Account is banned': 'Аккаунт заблокирован',
  '2FA code required': 'Требуется код двухфакторной аутентификации',
  'Invalid 2FA code': 'Неверный код 2FA',
  'User not found or banned': 'Пользователь не найден или заблокирован',
  'Email or username already exists': 'Email или имя пользователя уже заняты',
  'Profile not found': 'Профиль не найден',
  'Insufficient balance': 'Недостаточно средств',
  'Transfer failed': 'Перевод не выполнен',
  'Login failed': 'Ошибка входа',
  'Registration failed': 'Ошибка регистрации',
  'Purchase failed': 'Покупка не удалась',
  'Bid failed': 'Ставка не принята',
  'Subscription failed': 'Подписка не оформлена',
  'Buy failed': 'Покупка не удалась',
  'Sell failed': 'Продажа не удалась',
};

export function tRank(rank: string): string {
  return RANK_LABELS[rank] ?? rank;
}

export function tAccount(type: string): string {
  return ACCOUNT_LABELS[type] ?? type;
}

export function tStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function tRarity(rarity: string): string {
  return RARITY_LABELS[rarity.toUpperCase()] ?? rarity;
}

export function tCase(type: string): string {
  return CASE_LABELS[type] ?? type;
}

export function tBusiness(type: string): string {
  return BUSINESS_LABELS[type] ?? type;
}

export function tError(message: string): string {
  return API_ERRORS[message] ?? message;
}
