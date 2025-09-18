# AI Configuration для Railway Deploy

## Обзор

Эта документация описывает настройку AI-функциональности для генерации описаний листингов с использованием OpenAI API.

## Переменные окружения

Добавьте следующие переменные окружения в настройках Railway:

### Обязательные переменные

```bash
OPENAI_API_KEY=your_openai_api_key_here
```
**Описание**: API ключ от OpenAI. Получите его на [platform.openai.com](https://platform.openai.com/api-keys)

### Опциональные переменные

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_RATE_LIMIT_PER_MINUTE=60
```

**Описание переменных**:
- `OPENAI_BASE_URL`: URL OpenAI API (по умолчанию: https://api.openai.com/v1)
- `OPENAI_MODEL`: Модель для использования (по умолчанию: gpt-4o-mini)
- `AI_RATE_LIMIT_PER_MINUTE`: Лимит запросов в минуту (по умолчанию: 60)

## Настройка в Railway

1. Зайдите в настройки вашего проекта на Railway
2. Перейдите в раздел "Variables"
3. Добавьте переменные по одной:
   - Нажмите "New Variable"
   - Введите название переменной (например, `OPENAI_API_KEY`)
   - Введите значение
   - Нажмите "Add"

## API Эндпоинт

После настройки будет доступен новый эндпоинт:

```
POST /api/v1/listings/{id}/generate-draft
```

### Тело запроса

```json
{
  "locale": "it-IT",
  "tone": "professionale",
  "length": "medium"
}
```

### Параметры

- `locale`: BCP-47 код языка (it-IT, ru-RU, en-US). По умолчанию: it-IT
- `tone`: "professionale" | "informale" | "premium". По умолчанию: professionale
- `length`: "short" | "medium" | "long". По умолчанию: medium

### Пример ответа

```json
{
  "title": "Luminoso trilocale con balcone in centro",
  "summary": "Trilocale ristrutturato vicino alla metro...",
  "description": "A due passi da ...",
  "highlights": [
    "Cucina abitabile",
    "Doppia esposizione", 
    "Riscaldamento autonomo"
  ],
  "disclaimer": "Le informazioni sono indicative e non costituiscono vincolo contrattuale.",
  "seo": {
    "keywords": ["appartamento", "affitto Milano", "trilocale"],
    "metaDescription": "Trilocale ristrutturato in centro..."
  }
}
```

## Коды ошибок

- `400` — неверные параметры / невалидный ответ модели
- `401/403` — нет прав доступа к объявлению
- `404` — объявление не найдено
- `429` — превышен лимит запросов
- `502` — ошибка провайдера LLM
- `500` — иные ошибки сервера

## Безопасность

- **НИКОГДА** не коммитьте API ключи в репозиторий
- Ключи должны храниться только в переменных окружения Railway
- Используйте принцип минимальных привилегий для API ключей

## Мониторинг

Система автоматически логирует:
- RequestId для трассировки запросов
- Время ответа AI
- Использование токенов
- Ошибки LLM с кодами

Логи можно просматривать в Railway Dashboard.

## Troubleshooting

### Ошибка "OPENAI_API_KEY environment variable is required"

**Решение**: Убедитесь, что переменная `OPENAI_API_KEY` добавлена в Railway и содержит действительный ключ.

### Ошибка 502 "LLM provider error"

**Возможные причины**:
- Неверный API ключ
- Превышен лимит запросов OpenAI
- Проблемы с сетью до OpenAI

**Решение**: Проверьте статус API ключа и лимиты на platform.openai.com

### Fallback режим

При любых ошибках AI система автоматически переключается в режим fallback и возвращает базовое описание на основе доступных данных листинга.
