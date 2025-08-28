# AI Realtor Backend

Минимально-жизнеспособный бекенд-сервис (API-шлюз) на NestJS + PostgreSQL с документацией Swagger для AI-риелтора.

## Технологический стек

- **Runtime/Framework**: Node.js 20+, NestJS 10+
- **БД**: PostgreSQL 14+ (через Prisma)
- **Миграции**: Prisma Migrate
- **Документация**: @nestjs/swagger (UI на /docs, JSON на /docs-json)
- **Валидация**: class-validator + class-transformer
- **Логирование**: стандартный Nest Logger (уровень debug в dev)
- **CORS**: включен, по умолчанию разрешает http://localhost:3000

## API Эндпоинты

### Системные эндпоинты
- `GET /health` - проверка состояния сервиса
- `GET /api/v1/config` - публичная конфигурация для фронтенда

### Листинги (CRUD)
- `POST /api/v1/listings` - создать черновик листинга
- `GET /api/v1/listings` - получить список с фильтрацией и пагинацией
- `GET /api/v1/listings/:id` - получить листинг по ID
- `PATCH /api/v1/listings/:id` - частично обновить листинг
- `DELETE /api/v1/listings/:id` - мягко удалить листинг

## Быстрый старт

### Локальный запуск (без Docker)

1. **Установите зависимости**
   \`\`\`bash
   npm install
   \`\`\`

2. **Настройте переменные окружения**
   \`\`\`bash
   cp env.example .env
   # Отредактируйте .env под ваши настройки
   \`\`\`

3. **Поднимите PostgreSQL** (например, через Docker)
   \`\`\`bash
   docker run --name postgres-realtor -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=realtor -p 5432:5432 -d postgres:16
   \`\`\`

4. **Сгенерируйте Prisma клиент и примените миграции**
   \`\`\`bash
   npm run prisma:generate
   npm run prisma:migrate --name init
   \`\`\`

5. **Запустите сервер в режиме разработки**
   \`\`\`bash
   npm run start:dev
   \`\`\`

### Запуск через Docker Compose

1. **Скопируйте переменные окружения**
   \`\`\`bash
   cp env.example .env
   \`\`\`

2. **Запустите всё окружение**
   \`\`\`bash
   docker compose up --build
   \`\`\`

## Доступ к сервису

После успешного запуска:

- **API**: http://localhost:4000
- **Swagger документация**: http://localhost:4000/docs
- **Swagger JSON**: http://localhost:4000/docs-json
- **Health check**: http://localhost:4000/health
- **Config API**: http://localhost:4000/api/v1/config
- **Listings API**: http://localhost:4000/api/v1/listings

## Примеры cURL запросов

### Создать листинг
\`\`\`bash
curl -X POST http://localhost:4000/api/v1/listings \\
  -H "Content-Type: application/json" \\
  -d '{
    "type":"sale",
    "title":"Bilocale luminoso",
    "price":199000,
    "userFields":{"city":"Milano","floor":2,"balcony":true}
  }'
\`\`\`

### Получить список листингов
\`\`\`bash
curl "http://localhost:4000/api/v1/listings?page=1&limit=10&status=draft&q=Bilo"
\`\`\`

### Обновить листинг
\`\`\`bash
curl -X PATCH http://localhost:4000/api/v1/listings/<id> \\
  -H "Content-Type: application/json" \\
  -d '{"price":205000,"userFields":{"balcony":false,"notes":"cortile tranquillo"}}'
\`\`\`

### Удалить листинг
\`\`\`bash
curl -X DELETE http://localhost:4000/api/v1/listings/<id>
\`\`\`

## Доступные команды

\`\`\`bash
# Разработка
npm run start:dev      # Запуск в режиме разработки с hot reload
npm run start:debug    # Запуск в режиме отладки

# Продакшен
npm run build          # Сборка проекта
npm run start:prod     # Запуск продакшен версии

# Prisma
npm run prisma:generate # Генерация Prisma клиента
npm run prisma:migrate  # Создание и применение миграций
npm run prisma:deploy   # Применение миграций (для продакшена)
npm run prisma:studio   # Открыть Prisma Studio

# Тесты
npm run test           # Запуск юнит тестов
npm run test:e2e       # Запуск e2e тестов
npm run test:cov       # Запуск тестов с покрытием

# Линтинг
npm run lint           # Проверка и исправление кода
npm run format         # Форматирование кода
\`\`\`

## Структура проекта

\`\`\`
backend/
├─ package.json
├─ tsconfig.json  
├─ nest-cli.json
├─ prisma/
│  ├─ schema.prisma      # Схема базы данных
│  └─ migrations/        # Миграции (генерируются автоматически)
├─ src/
│  ├─ main.ts           # Точка входа приложения
│  ├─ app.module.ts     # Корневой модуль
│  ├─ common/           # Общие компоненты
│  │  ├─ filters/       # Глобальные фильтры ошибок
│  │  ├─ interceptors/  # Интерсепторы
│  │  └─ pipes/         # Пайпы валидации
│  ├─ system/           # Системные эндпоинты
│  ├─ listings/         # Модуль листингов
│  │  ├─ dto/          # DTO с валидацией
│  │  └─ types/        # TypeScript типы
│  └─ prisma/          # Prisma сервис
├─ test/               # E2E тесты
├─ env.example         # Пример переменных окружения
├─ Dockerfile          # Docker конфигурация
└─ docker-compose.yml  # Docker Compose конфигурация
\`\`\`

## Модель данных

### Listing (Листинг недвижимости)

\`\`\`typescript
{
  id: string,           // UUID
  type: "sale" | "rent", // Тип операции
  status: "draft" | "ready" | "archived", // Статус
  title?: string,       // Заголовок (до 200 символов)
  price?: number,       // Цена
  userFields?: object,  // Произвольные поля пользователя
  aiHints?: object,     // Зарезервировано для подсказок ИИ
  createdAt: string,    // Дата создания (ISO-8601)
  updatedAt: string,    // Дата обновления (ISO-8601)
  deletedAt?: string    // Дата мягкого удаления
}
\`\`\`

## Особенности реализации

- **Мягкое удаление**: удалённые записи помечаются `deletedAt` и исключаются из выборок
- **Валидация**: автоматическая валидация всех входящих данных
- **Пагинация**: все списки поддерживают пагинацию
- **Поиск**: поиск по заголовку через ILIKE (регистронезависимый)
- **Мерджинг полей**: `userFields` объединяются с существующими при обновлении
- **CORS**: настроен для фронтенда на localhost:3000
- **Swagger**: автоматическая документация API
- **Логирование**: структурированные логи через NestJS Logger

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| NODE_ENV | development | Окружение |
| PORT | 4000 | Порт сервера |
| API_PREFIX | /api/v1 | Префикс API |
| DATABASE_URL | - | Строка подключения к PostgreSQL |
| CORS_ORIGIN | http://localhost:3000 | Разрешённый источник CORS |
| APP_VERSION | 0.1.0 | Версия приложения |
| MAX_UPLOAD_MB | 25 | Максимальный размер загрузки |
| FEATURES_LISTINGS | true | Включить функции листингов |
