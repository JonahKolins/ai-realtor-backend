# 🎨 Размещение фронтенда с бекендом

## 🏗️ **Рекомендуемая архитектура:**

### **Два отдельных Railway проекта:**
```
🔗 Backend:   https://ai-realtor-backend.up.railway.app
🔗 Frontend:  https://ai-realtor-frontend.up.railway.app
```

## 📋 **План развертывания:**

### **1. Бекенд (уже готов)**
- ✅ Деплой на `ai-realtor-backend.up.railway.app`
- ✅ PostgreSQL база данных
- ✅ API доступно по `/api/v1/*`

### **2. Фронтенд (новый проект)**
- 🎯 Создать отдельный Railway проект
- 🎯 Настроить подключение к бекенд API
- 🎯 Деплой на `ai-realtor-frontend.up.railway.app`

## ⚙️ **Настройка фронтенда:**

### **Environment Variables для фронтенда:**
```env
# Next.js / React
NEXT_PUBLIC_API_URL=https://ai-realtor-backend.up.railway.app/api/v1
# или
REACT_APP_API_URL=https://ai-realtor-backend.up.railway.app/api/v1

# Vite
VITE_API_URL=https://ai-realtor-backend.up.railway.app/api/v1
```

### **Настройка CORS в бекенде:**
Обновите `CORS_ORIGIN` в переменных бекенда:
```env
CORS_ORIGIN=https://ai-realtor-frontend.up.railway.app
```

## 🌐 **Альтернатива: Собственный домен**

### **С вашим доменом casalabia.dev:**
```
🔗 Frontend:  https://casalabia.dev          (или app.casalabia.dev)
🔗 Backend:   https://api.casalabia.dev
```

### **Настройка DNS:**
```
# В Cloudflare/DNS провайдере:
A     casalabia.dev      → IP Railway фронтенда
CNAME api.casalabia.dev → ai-realtor-backend.up.railway.app
```

### **Преимущества собственного домена:**
- ✅ Профессиональный вид
- ✅ Брендинг
- ✅ Контроль над URL
- ✅ Возможность переезда между провайдерами

## 🔧 **Пример интеграции в коде фронтенда:**

### **React/Next.js:**
```javascript
// api/config.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
                     'https://ai-realtor-backend.up.railway.app/api/v1';

// api/listings.js
export const getListings = async () => {
  const response = await fetch(`${API_BASE_URL}/listings`);
  return response.json();
};
```

### **Vue/Nuxt:**
```javascript
// nuxt.config.js
export default {
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_URL || 
               'https://ai-realtor-backend.up.railway.app/api/v1'
    }
  }
}
```

## 🚀 **Пошаговый деплой фронтенда:**

### **1. Создание проекта на Railway:**
1. Новый проект в Railway
2. Подключить репозиторий фронтенда
3. Настроить переменные окружения

### **2. Обновление CORS в бекенде:**
1. Откройте бекенд проект в Railway
2. Variables → обновите `CORS_ORIGIN`
3. Redeploy бекенда

### **3. Тестирование:**
```bash
# Проверка API:
curl https://ai-realtor-backend.up.railway.app/health

# Проверка CORS:
curl -H "Origin: https://ai-realtor-frontend.up.railway.app" \
     https://ai-realtor-backend.up.railway.app/api/v1/listings
```

## ✨ **Результат:**
- 🎯 Два независимых проекта
- 🎯 Простая настройка CORS
- 🎯 Возможность независимого масштабирования
- 🎯 Готовность к добавлению собственного домена

**Готово к продакшену!** 🚀
