# AI Content Generation - Улучшенная система генерации текстов

## Обзор

Система генерации AI-контента для объявлений о недвижимости была значительно улучшена для повышения плотности, полезности и качества текстов.

## Ключевые улучшения

### 1. Контент-план (Content Plan)

Каждое описание теперь генерируется по строгому плану из **5 параграфов**:

1. **Intro** (30-90 слов): Хук + общий обзор
2. **Interni** (50-130 слов): Внутренние пространства, планировка, отделка
3. **Esterni/Servizi** (40-100 слов): Балконы/террасы, внешние зоны, услуги кондоминиума
4. **Zona/Trasporti** (50-110 слов): Район, транспорт, POI с расстояниями пешком
5. **Termini** (30-70 слов): Цена, платежи, доступность, условия

Целевое количество слов зависит от параметра `length`:
- **SHORT**: ~200 слов всего
- **MEDIUM**: ~350 слов всего
- **LONG**: ~500 слов всего

### 2. Must Cover - обязательные элементы

Система автоматически определяет, какие факты ОБЯЗАТЕЛЬНО должны быть упомянуты (если они есть в данных):

**Обязательные (Required):**
- Город/район
- Площадь в m²
- Планировка (комнаты/спальни/санузлы)
- Этаж и наличие лифта

**Опциональные (Optional):**
- Балкон/терраса с площадью
- Тип отопления
- Класс энергоэффективности
- Пешие расстояния до POI (метро, парк, магазины)
- Кондо-платежи

### 3. Жёсткий контракт структуры

AI получает строгие инструкции:

**Description:**
- Ровно 5 параграфов (разделены `\n\n`)
- Каждый параграф соблюдает целевой объём ±10%
- Каждый параграф содержит ≥2 конкретных факта

**Highlights:**
- 5-7 элементов
- Каждый 3-10 слов
- Формат: "Конкретный факт + детали" (например: "Balcone 8 m² affaccio su giardino")
- НЕТ общих фраз ("ottima posizione"), ДА конкретика ("Metro a 3 min a piedi")

**SEO:**
- keywords: 5-8 релевантных терминов
- metaDescription: 120-160 символов

### 4. Few-Shot обучение

В промпт встроен пример высококачественного объявления на итальянском, русском и английском языках, демонстрирующий эталон плотности и стиля.

### 5. Двухпроходная генерация (опционально)

Когда включено `AI_REFINE_ENABLED=true`:

1. **Первый проход (Draft):** Генерация черновика
2. **Оценка качества:** Проверка покрытия mustCover и структуры
3. **Второй проход (Refine):** Если качество ниже порога → улучшение черновика
   - Уплотнение текста
   - Добавление недостающих mustCover
   - Выравнивание объёмов секций
   - БЕЗ придумывания новых фактов!

### 6. Пост-линтер качества

После генерации система проверяет:

**Структурная валидность:**
- 5 параграфов в description
- 5-7 highlights
- Корректный JSON

**Coverage Score (0.0-1.0):**
- Какой % mustCover элементов присутствует в тексте
- Если < `AI_QUALITY_THRESHOLD` → запускается refine (если включён)

**Метрики логируются:**
```json
{
  "coverageScore": 0.85,
  "structureValid": true,
  "paragraphCount": 5,
  "highlightsCount": 6,
  "missingMustCover": ["classe energetica B"]
}
```

### 7. Улучшенный санитайзер

**Запрещённые категории:**
- Дискриминация: "solo italiani", "no stranieri", "только для местных"
- Гарантии: "garantito", "100% safe", "гарантировано"
- Недоказуемые суперлативы: "il migliore", "самый красивый", "the best"
- Медицинские утверждения: "terapeutico", "целебный"

**Нормализация:**
- Title: макс 100 символов
- Summary: 80-250 слов (зависит от length)
- Highlights: 3-10 слов каждый, макс 7 элементов
- SEO keywords: макс 8
- metaDescription: 120-160 символов

### 8. Параметры модели

```typescript
temperature: 0.6          // Баланс креативности и точности
frequency_penalty: 0.2    // Снижение повторений
top_p: 0.8               // Nucleus sampling
max_tokens: 2000         // Достаточно для LONG
```

Для refine pass:
```typescript
temperature: 0.5          // Более консервативно
frequency_penalty: 0.3    // Меньше повторений
```

## Конфигурация

### Переменные окружения

```bash
# OpenAI базовая конфигурация
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
AI_RATE_LIMIT_PER_MINUTE=60

# Двухпроходная генерация
AI_REFINE_ENABLED=false        # true для включения refine
AI_QUALITY_THRESHOLD=0.7       # 0.0-1.0, порог для refine
```

### Рекомендации

**Для production:**
```bash
AI_REFINE_ENABLED=true
AI_QUALITY_THRESHOLD=0.7
OPENAI_MODEL=gpt-4o-mini  # или gpt-4o для premium качества
```

**Для dev/test:**
```bash
AI_REFINE_ENABLED=false   # Быстрее и дешевле
AI_QUALITY_THRESHOLD=0.5
```

## API использование

Ничего не изменилось в публичном API:

```typescript
POST /api/v1/listings/:id/draft

{
  "locale": "it-IT",      // или "ru-RU", "en-US"
  "tone": "professionale", // или "informale", "premium"
  "length": "medium"      // или "short", "long"
}

// Response - тот же интерфейс IAIGenerationResponse
{
  "title": "...",
  "summary": "...",
  "description": "...",    // 5 параграфов
  "highlights": [...],     // 5-7 элементов
  "disclaimer": "...",
  "seo": {
    "keywords": [...],     // 5-8 элементов
    "metaDescription": "..." // 120-160 chars
  }
}
```

## Архитектура

```
AiDraftService
  ├─ AiPromptService
  │   ├─ generateContentPlan(length) → ContentPlan
  │   ├─ generateMustCover(listing, lang) → MustCover
  │   ├─ build(...) → ChatCompletionMessageParam[]
  │   └─ buildRefinePrompt(...) → ChatCompletionMessageParam[]
  │
  ├─ AiOpenaiService
  │   └─ createChatCompletion({messages, temp, ...}) → response
  │
  └─ Internal methods
      ├─ parseAndValidateDraft(content) → ListingDraftDto | null
      ├─ assessQuality(draft, mustCover, plan) → QualityMetrics
      ├─ refineDraft(...) → ListingDraftDto | null
      ├─ sanitizeContent(draft, length) → ListingDraftDto
      └─ createFallbackDraft(...) → ListingDraftDto
```

## Метрики и мониторинг

Все ключевые события логируются:

```typescript
// Draft generation start
{ requestId, listingId, locale, tone, length, refineEnabled }

// Quality metrics (после каждого прохода)
{ requestId, coverageScore, structureValid, paragraphCount, highlightsCount, missingMustCover }

// Refine trigger
{ requestId, reason: "Coverage score 0.6 below threshold 0.7" }

// Final result
{ requestId, listingId, finalCoverageScore, usage: {...} }
```

## Примеры качественных выходов

### Высокое качество (coverage: 0.9+)

```json
{
  "title": "Trilocale 85 m² ristrutturato con balcone a Porta Romana",
  "description": "Trilocale ristrutturato di 85 m² in Via Bergognone 15...\n\nGli spazi interni includono soggiorno 25 m²...\n\nBalcone 8 m² affaccio su cortile...\n\nPosizione strategica a 3 minuti a piedi dalla metro M2 Romolo...\n\nPrezzo di vendita €320.000, spese condominiali €80 al mese...",
  "highlights": [
    "85 m² piano 3° con ascensore",
    "Balcone 8 m² cortile silenzioso",
    "Metro Romolo a 3 min piedi",
    "Riscaldamento autonomo classe B",
    "Ristrutturato infissi nuovi 2021",
    "Parco Ravizza 5 min a piedi"
  ]
}
```

### Среднее качество (coverage: 0.6-0.7)

- Некоторые mustCover элементы пропущены
- Параграфы могут быть короче целевых
- Менее конкретные highlights

→ Система запустит refine pass (если включён)

## Acceptance Criteria ✅

- [x] description состоит из 5 параграфов в нужном порядке
- [x] Каждый параграф в рамках целевого объёма ±10%
- [x] highlights: 5-7 элементов, каждый 3-10 слов
- [x] Нет общих фраз, только конкретика
- [x] seo.keywords: 5-8 элементов
- [x] seo.metaDescription: 120-160 символов
- [x] Нет лишних полей в JSON
- [x] Двухпроходное улучшение работает (опционально)
- [x] Пост-линтер оценивает качество
- [x] Санитайзер удаляет запрещённые формулировки

## Troubleshooting

### Низкое качество текстов

1. Проверьте `AI_QUALITY_THRESHOLD` - возможно слишком низкий
2. Включите `AI_REFINE_ENABLED=true`
3. Убедитесь что входные данные (listing.userFields) достаточно полные
4. Проверьте логи: `missingMustCover` покажет что отсутствует

### Слишком дорого (много токенов)

1. Отключите `AI_REFINE_ENABLED=false` 
2. Используйте `length: "short"`
3. Рассмотрите переход на gpt-4o-mini (если используете gpt-4o)

### Тексты на неправильном языке

Проверьте параметр `locale` в запросе:
- `it-IT` → итальянский
- `ru-RU` → русский  
- `en-US` → английский

## Будущие улучшения (V2)

- [ ] A/B тестирование разных промптов
- [ ] Кеширование похожих листингов
- [ ] Персонализация по агентству/риелтору
- [ ] Интеграция с plagiarism checker
- [ ] Автоматическая оптимизация SEO keywords
- [ ] Multilingual fallback chain

