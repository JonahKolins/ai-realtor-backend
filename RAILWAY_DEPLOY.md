# 🚂 Деплой на Railway.app

## 📋 Пошаговая инструкция

### 1. Подготовка проекта ✅
- [x] Создан `railway.json` с конфигурацией
- [x] Добавлена команда `start:railway` в package.json
- [x] Проект готов к деплою

### 2. Создание аккаунта Railway
1. Перейдите на [railway.app](https://railway.app)
2. Нажмите **"Start a New Project"**
3. Войдите через GitHub

### 3. Деплой проекта
1. **New Project** → **Deploy from GitHub repo**
2. Выберите репозиторий `ai-realtor-backend`
3. Railway автоматически обнаружит NestJS проект

### 4. Добавление PostgreSQL ⚠️ КРИТИЧЕСКИ ВАЖНО!
1. В дашборде проекта нажмите **"+ New"**
2. Выберите **"Database"** → **"Add PostgreSQL"**
3. ✅ **Убедитесь, что PostgreSQL плагин подключен к вашему сервису**
4. Railway автоматически создаст переменную `DATABASE_URL`
5. ✅ **Проверьте в Variables что `DATABASE_URL` появилась**

> ⚠️ **БЕЗ PostgreSQL проект НЕ запустится!**

### 5. Настройка переменных окружения
Добавьте в Variables секции:

```env
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
# CORS - обновите на URL вашего фронтенда:
CORS_ORIGIN=https://your-frontend-app.up.railway.app
# Для разработки: CORS_ORIGIN=http://localhost:3000
APP_VERSION=0.1.0
MAX_UPLOAD_MB=25
FEATURES_LISTINGS=true
```

> ⚠️ `DATABASE_URL` добавится автоматически после создания PostgreSQL

### 6. Первый деплой
1. Нажмите **"Deploy"**
2. Railway запустит сборку и деплой
3. Получите URL вида: `https://your-app-name.up.railway.app`

## 🔗 Доступные эндпоинты

После деплоя ваш API будет доступен:

- **🏠 Главная**: `https://your-app.up.railway.app`
- **💗 Health**: `https://your-app.up.railway.app/health`
- **📖 Swagger**: `https://your-app.up.railway.app/docs`
- **📋 Listings**: `https://your-app.up.railway.app/api/v1/listings`

## ⚙️ Полезные команды

### Локальная проверка:
```bash
npm run build
npm run start:prod
```

### Просмотр логов Railway:
```bash
railway logs
```

## 🔧 Troubleshooting

### ❌ Ошибка: "Environment variable not found: DATABASE_URL"
**Причина:** PostgreSQL база не добавлена или неправильно настроена

**Решение:**
1. ✅ Добавьте PostgreSQL: Dashboard → **"+ New"** → **"Database"** → **"PostgreSQL"**
2. ✅ Убедитесь что база **подключена к вашему сервису**
3. ✅ Проверьте Variables - должна появиться `DATABASE_URL`
4. ✅ Redeploy проекта после добавления базы

### ❌ Ошибка: "Prisma failed to detect libssl/openssl"
**Причина:** Проблемы с OpenSSL в контейнере

**Решение:** ✅ Исправлено в обновленной конфигурации

### ❌ Ошибки CORS:
Обновите `CORS_ORIGIN` на фронтенд URL

### ❌ Проблемы с портом:
Railway автоматически назначает порт через `$PORT`

### 🔍 Диагностика:
Проект автоматически проверяет DATABASE_URL при запуске

## 🚀 Готово!

Ваш AI Realtor Backend теперь работает в облаке!
