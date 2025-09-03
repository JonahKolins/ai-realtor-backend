# 🌍 Настройка CORS для множественных доменов

## ✅ **Готово! Бекенд поддерживает оба домена одновременно**

### **🎯 Что настроено:**

Бекенд теперь работает с:
- ✅ **Локальная разработка:** `http://localhost:3000`
- ✅ **Продакшн фронтенд:** `https://casalabia.dev`
- ✅ **Альтернативный домен:** `https://www.casalabia.dev`

## ⚙️ **Как это работает:**

### **1. Умная CORS конфигурация**
```typescript
// В src/main.ts:
const corsOrigins = corsOriginEnv.split(',').map(origin => origin.trim());

app.enableCors({
  origin: (origin, callback) => {
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  }
});
```

### **2. Переменная окружения**
```env
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://www.casalabia.dev
```

## 🚀 **Конфигурация для разных сред:**

### **📦 Railway (Продакшн):**
```env
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://www.casalabia.dev
```

### **💻 Локальная разработка (.env):**
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/realtor?schema=public
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://www.casalabia.dev
```

## 📋 **Пошаговая настройка:**

### **Шаг 1: Railway Variables**
В Railway Dashboard → Variables:
```env
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://www.casalabia.dev
```

### **Шаг 2: Локальный .env файл**
Создайте `.env` в корне проекта:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/realtor?schema=public
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://www.casalabia.dev
API_PREFIX=/api/v1
APP_VERSION=0.1.0
FEATURES_LISTINGS=true
```

### **Шаг 3: Проверка в логах**
После запуска увидите:
```
🌍 CORS enabled for: http://localhost:3000, https://casalabia.dev, https://www.casalabia.dev
```

## 🔧 **Примеры использования:**

### **Фронтенд на localhost:3000:**
```javascript
// Работает из локального фронтенда
fetch('https://your-api.up.railway.app/api/v1/listings')
  .then(response => response.json())
  .then(data => console.log(data));
```

### **Фронтенд на casalabia.dev:**
```javascript
// Работает из продакшн фронтенда
fetch('https://your-api.up.railway.app/api/v1/listings')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🛡️ **Безопасность:**

- ✅ Только указанные домены имеют доступ
- ✅ Поддержка credentials для авторизации
- ✅ Правильные HTTP методы и заголовки
- ✅ Гибкое добавление новых доменов

## 🎯 **Добавление новых доменов:**

Просто обновите переменную:
```env
CORS_ORIGIN=http://localhost:3000,https://casalabia.dev,https://staging.casalabia.dev,https://app.casalabia.dev
```

## ✨ **Готово!**

Теперь ваш бекенд одновременно поддерживает:
- 🏠 Локальную разработку 
- 🌐 Продакшн фронтенд
- 🔄 Любые дополнительные домены

**Деплойте и наслаждайтесь!** 🚀
