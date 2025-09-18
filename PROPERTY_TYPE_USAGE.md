# 🏘️ **Использование поля propertyType**

## ✅ **Что добавлено:**

### **🆕 Новое поле `propertyType`:**
- **Тип:** `string` (гибкое поле)
- **Валидация:** Проверяется по списку допустимых значений
- **По умолчанию:** `"default"`
- **Опционально:** Может быть пустым при создании

### **📋 Допустимые значения:**
```typescript
const PROPERTY_TYPES = [
  'default',     // По умолчанию
  'house',       // Дом  
  'apartment',   // Квартира
  'room',        // Комната
  'cellar',      // Подвал/кладовая
  'garage',      // Гараж
  'parking',     // Парковочное место
  'commercial'   // Коммерческая недвижимость
];
```

## 🚀 **Использование в API**

### **1. 📤 Создание листинга с propertyType:**

#### **Минимальный запрос:**
```javascript
// POST /api/v1/listings
{
  "type": "sale"
  // propertyType по умолчанию будет "default"
}
```

#### **Полный запрос:**
```javascript
// POST /api/v1/listings
{
  "type": "sale",
  "propertyType": "apartment",
  "title": "3-комнатная квартира",
  "price": 450000,
  "userFields": {
    "city": "Milano",
    "rooms": 3,
    "floor": 5
  }
}
```

### **2. 🔄 Обновление propertyType:**

```javascript
// PATCH /api/v1/listings/{id}
{
  "propertyType": "house"
}
```

### **3. 🔍 Фильтрация по propertyType:**

```javascript
// GET /api/v1/listings?propertyType=apartment
// GET /api/v1/listings?type=sale&propertyType=house
// GET /api/v1/listings?status=ready&propertyType=commercial
```

### **4. 📥 Ответ API содержит propertyType:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "sale",
    "propertyType": "apartment",  // ← Новое поле
    "status": "draft",
    "title": "3-комнатная квартира",
    "price": 450000,
    "userFields": { "city": "Milano" },
    "createdAt": "2025-09-12T15:13:00Z",
    "updatedAt": "2025-09-12T15:13:00Z"
  }
}
```

## 📱 **Примеры для фронтенда**

### **1. 🎨 React компонент для выбора типа:**

```javascript
// components/PropertyTypeSelect.js
import React from 'react';

const PROPERTY_TYPES = [
  { value: 'default', label: 'Не указано' },
  { value: 'house', label: 'Дом' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'room', label: 'Комната' },
  { value: 'cellar', label: 'Подвал/Кладовая' },
  { value: 'garage', label: 'Гараж' },
  { value: 'parking', label: 'Парковка' },
  { value: 'commercial', label: 'Коммерческая' },
];

function PropertyTypeSelect({ value, onChange, required = false }) {
  return (
    <div>
      <label>Тип недвижимости:</label>
      <select 
        value={value || 'default'} 
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {PROPERTY_TYPES.map(type => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default PropertyTypeSelect;
```

### **2. 🔧 API клиент с propertyType:**

```javascript
// utils/api.js - обновленный API клиент
export const api = {
  // Создание с propertyType
  async createListing(data) {
    const response = await fetch(`${API_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        propertyType: data.propertyType, // ← Новое поле
        title: data.title,
        price: data.price,
        userFields: data.userFields
      })
    });
    return response.json();
  },

  // Обновление propertyType
  async updatePropertyType(id, propertyType) {
    const response = await fetch(`${API_URL}/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyType })
    });
    return response.json();
  },

  // Фильтрация по propertyType
  async getListingsByPropertyType(propertyType, page = 1) {
    const params = new URLSearchParams({
      propertyType,
      page: page.toString(),
      limit: '20'
    });
    
    const response = await fetch(`${API_URL}/listings?${params}`);
    return response.json();
  },

  // Комбинированная фильтрация
  async getFilteredListings(filters) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.propertyType) params.append('propertyType', filters.propertyType);
    if (filters.status) params.append('status', filters.status);
    if (filters.q) params.append('q', filters.q);
    params.append('page', filters.page || '1');
    params.append('limit', filters.limit || '20');
    
    const response = await fetch(`${API_URL}/listings?${params}`);
    return response.json();
  }
};
```

### **3. 📋 Форма создания с propertyType:**

```javascript
// components/CreateListingForm.js
import React, { useState } from 'react';
import PropertyTypeSelect from './PropertyTypeSelect';
import { api } from '../utils/api';

function CreateListingForm() {
  const [formData, setFormData] = useState({
    type: 'sale',
    propertyType: 'default',
    title: '',
    price: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const listingData = {
        type: formData.type,
        propertyType: formData.propertyType,
        ...(formData.title && { title: formData.title }),
        ...(formData.price && { price: parseFloat(formData.price) })
      };

      const result = await api.createListing(listingData);
      alert(`Листинг создан! ID: ${result.data.id}`);
      
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Создать объявление</h2>
      
      {/* Тип сделки (обязательно) */}
      <div>
        <label>Тип сделки:</label>
        <select 
          value={formData.type} 
          onChange={(e) => setFormData(prev => ({...prev, type: e.target.value}))}
          required
        >
          <option value="sale">Продажа</option>
          <option value="rent">Аренда</option>
        </select>
      </div>

      {/* Тип недвижимости (новое поле) */}
      <PropertyTypeSelect
        value={formData.propertyType}
        onChange={(value) => setFormData(prev => ({...prev, propertyType: value}))}
      />

      {/* Остальные поля */}
      <div>
        <label>Заголовок:</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
          placeholder="Например: 3-комнатная в центре"
        />
      </div>

      <div>
        <label>Цена:</label>
        <input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
          placeholder="Цена в евро"
        />
      </div>

      <button type="submit">Создать листинг</button>
    </form>
  );
}
```

### **4. 🔍 Компонент фильтрации:**

```javascript
// components/ListingFilters.js
import React, { useState } from 'react';
import PropertyTypeSelect from './PropertyTypeSelect';

function ListingFilters({ onFiltersChange }) {
  const [filters, setFilters] = useState({
    type: '',
    propertyType: '',
    status: '',
    q: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="filters">
      <h3>Фильтры</h3>
      
      <div>
        <label>Тип сделки:</label>
        <select 
          value={filters.type} 
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">Все</option>
          <option value="sale">Продажа</option>
          <option value="rent">Аренда</option>
        </select>
      </div>

      <div>
        <label>Тип недвижимости:</label>
        <select 
          value={filters.propertyType} 
          onChange={(e) => handleFilterChange('propertyType', e.target.value)}
        >
          <option value="">Все типы</option>
          <option value="apartment">Квартира</option>
          <option value="house">Дом</option>
          <option value="room">Комната</option>
          <option value="garage">Гараж</option>
          <option value="commercial">Коммерческая</option>
        </select>
      </div>

      <div>
        <label>Статус:</label>
        <select 
          value={filters.status} 
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Все</option>
          <option value="draft">Черновик</option>
          <option value="ready">Готов</option>
          <option value="archived">Архив</option>
        </select>
      </div>

      <div>
        <label>Поиск:</label>
        <input
          type="text"
          value={filters.q}
          onChange={(e) => handleFilterChange('q', e.target.value)}
          placeholder="Поиск по заголовку..."
        />
      </div>
    </div>
  );
}
```

## 🔧 **Валидация и ошибки**

### **❌ Ошибка при неправильном значении:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Property type must be one of: default, house, apartment, room, cellar, garage, parking, commercial"
  }
}
```

### **✅ Расширение enum в будущем:**

**Просто добавьте новое значение в `PROPERTY_TYPES`:**
```typescript
// В types/listing.types.ts
export const PROPERTY_TYPES = [
  'default',
  'house',
  'apartment', 
  'room',
  'cellar',
  'garage',
  'parking',
  'commercial',
  'villa',      // ← Новое значение
  'studio'      // ← Еще одно
] as const;
```

**Без изменения схемы БД или миграций!** 🎯

## 🎉 **Готово!**

Поле `propertyType` полностью интегрировано в API:
- ✅ Создание с валидацией
- ✅ Обновление через PATCH
- ✅ Фильтрация в списках
- ✅ Возврат в ответах
- ✅ Swagger документация
- ✅ Гибкое расширение значений

**Используйте в фронтенде!** 🚀
