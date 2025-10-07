# AI Content Generation - Руководство по тестированию

## Быстрый тест

### 1. Базовая генерация (без refine)

```bash
POST http://localhost:4000/api/v1/listings/{listing-id}/generate-draft
Content-Type: application/json

{
  "locale": "it-IT",
  "tone": "professionale",
  "length": "medium"
}
```

**Проверить:**
- ✅ Статус 200
- ✅ description содержит 5 параграфов (разделённых `\n\n`)
- ✅ highlights: массив из 5-7 элементов
- ✅ Каждый highlight: 3-10 слов
- ✅ seo.keywords: 5-8 элементов
- ✅ seo.metaDescription: 120-160 символов
- ✅ title: ≤100 символов

### 2. С включённым refine

**Установить в .env:**
```bash
AI_REFINE_ENABLED=true
AI_QUALITY_THRESHOLD=0.7
```

**Отправить тот же запрос**

**Проверить логи:**
```
[AiDraftService] Draft quality metrics { coverageScore: 0.6, ... }
[AiDraftService] Running refine pass { reason: "Coverage score 0.6 below threshold 0.7" }
[AiDraftService] Refined draft quality metrics { coverageScore: 0.85, ... }
```

## Тестовые сценарии

### Сценарий 1: Полные данные листинга

**Подготовка:**
Создать листинг с максимумом данных в `userFields`:

```json
{
  "type": "SALE",
  "propertyType": "Appartamento",
  "title": "Trilocale in vendita",
  "price": 320000,
  "userFields": {
    "city": "Milano",
    "neighborhood": "Porta Romana",
    "address": "Via Bergognone 15",
    "squareMeters": 85,
    "rooms": 3,
    "bedrooms": 2,
    "bathrooms": 1,
    "floor": 3,
    "elevator": true,
    "balcony": true,
    "balconySize": 8,
    "terrace": false,
    "heating": "autonomo a metano",
    "energyClass": "B",
    "walkingDistanceMetro": 3,
    "walkingDistancePark": 5,
    "walkingDistanceShops": 2,
    "condoFees": 80,
    "availability": "immediata"
  }
}
```

**Генерация:**
```bash
POST /api/v1/listings/{id}/generate-draft
{
  "locale": "it-IT",
  "tone": "professionale",
  "length": "medium"
}
```

**Ожидаемый результат:**
- Coverage score: 0.9+ (почти все mustCover покрыты)
- description упоминает: 85 m², 3 locali, piano 3, ascensore, balcone 8 m², riscaldamento autonomo, classe B, metro 3 min, парк 5 min, €80/mese spese
- Refine НЕ должен запускаться (качество высокое сразу)

### Сценарий 2: Минимальные данные

**Подготовка:**
```json
{
  "type": "RENT",
  "propertyType": "Appartamento",
  "title": "Appartamento in affitto",
  "price": 1200,
  "userFields": {
    "city": "Milano",
    "squareMeters": 60
  }
}
```

**Генерация:**
```bash
POST /api/v1/listings/{id}/generate-draft
{
  "locale": "it-IT",
  "tone": "informale",
  "length": "short"
}
```

**Ожидаемый результат:**
- Coverage score: 0.3-0.5 (мало данных)
- Refine ДОЛЖЕН запуститься (если enabled)
- Fallback НЕ должен сработать (структура валидна)
- description всё равно 5 параграфов, но короткие

### Сценарий 3: Разные языки

**Итальянский:**
```json
{ "locale": "it-IT", "tone": "premium", "length": "long" }
```

**Русский:**
```json
{ "locale": "ru-RU", "tone": "professionale", "length": "medium" }
```

**Английский:**
```json
{ "locale": "en-US", "tone": "informale", "length": "short" }
```

**Проверить:**
- ✅ description на правильном языке
- ✅ highlights на правильном языке
- ✅ mustCover элементы генерируются на правильном языке
- ✅ Нет смеси языков

### Сценарий 4: Разные тоны

**Professionale:**
```json
{ "locale": "it-IT", "tone": "professionale", "length": "medium" }
```
→ Формальный, компетентный язык

**Informale:**
```json
{ "locale": "it-IT", "tone": "informale", "length": "medium" }
```
→ Дружелюбный, разговорный стиль

**Premium:**
```json
{ "locale": "it-IT", "tone": "premium", "length": "medium" }
```
→ Элегантный, эксклюзивный язык

### Сценарий 5: Разные длины

**Short (~200 слов):**
```json
{ "locale": "it-IT", "tone": "professionale", "length": "short" }
```

**Medium (~350 слов):**
```json
{ "locale": "it-IT", "tone": "professionale", "length": "medium" }
```

**Long (~500 слов):**
```json
{ "locale": "it-IT", "tone": "professionale", "length": "long" }
```

**Проверить:**
- ✅ description длина соответствует выбранному уровню (±20%)

## Проверка пост-линтера

### Тест 1: Покрытие mustCover

1. Создать листинг с известными mustCover (город, м², этаж, балкон)
2. Сгенерировать draft
3. Проверить логи:
   ```
   missingMustCover: []  // Хорошо
   // или
   missingMustCover: ["balcone 8 m²"]  // Пропущен балкон
   ```
4. Если пропущено → refine должен добавить (при enabled)

### Тест 2: Структура

Проверить в ответе:
```javascript
const paragraphs = response.description.split(/\n\n+/);
console.assert(paragraphs.length === 5, "Must have 5 paragraphs");

const highlights = response.highlights;
console.assert(highlights.length >= 5 && highlights.length <= 7, "5-7 highlights");

highlights.forEach(h => {
  const words = h.split(/\s+/).length;
  console.assert(words >= 3 && words <= 10, "Each highlight 3-10 words");
});

console.assert(response.seo.keywords.length >= 5 && response.seo.keywords.length <= 8, "5-8 keywords");

const metaLen = response.seo.metaDescription.length;
console.assert(metaLen >= 120 && metaLen <= 160, "metaDescription 120-160 chars");
```

## Проверка санитайзера

### Тест запрещённых терминов

Иногда модель может игнорировать инструкции. Проверить что санитайзер удаляет:

**Дискриминация:**
- "solo italiani"
- "no stranieri"
- "только для местных"

**Гарантии:**
- "garantito"
- "100% safe"
- "гарантировано"

**Суперлативы:**
- "il migliore"
- "самый красивый"
- "the best"

**Проверка:**
```javascript
const text = response.description + response.summary + response.highlights.join(' ');
const prohibited = ['garantito', 'solo italiani', '100%', 'il migliore'];
prohibited.forEach(term => {
  console.assert(!text.toLowerCase().includes(term.toLowerCase()), `Prohibited term found: ${term}`);
});
```

## Нагрузочное тестирование

### Тест последовательных запросов

```bash
# Отправить 10 запросов подряд
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/v1/listings/{id}/generate-draft \
    -H "Content-Type: application/json" \
    -d '{"locale":"it-IT","tone":"professionale","length":"medium"}' &
done
wait
```

**Проверить:**
- ✅ Все запросы завершились успешно
- ✅ Нет ошибок rate limit (если в пределах лимита)
- ✅ Среднее время ответа стабильно

### Тест с разными листингами

```bash
# Подготовить 5-10 разных листингов
# Генерировать для каждого
```

**Проверить:**
- ✅ Все coverage scores > 0.5
- ✅ Среднее качество стабильно
- ✅ Refine срабатывает предсказуемо

## Мониторинг метрик

### Скрипт для анализа логов

```bash
# Среднее качество за последний час
grep "finalCoverageScore" logs/app.log | tail -100 | \
  awk '{print $NF}' | \
  awk '{s+=$1; n++} END {print "Average coverage:", s/n}'

# Частота refine
grep "Running refine pass" logs/app.log | wc -l
grep "Draft quality metrics" logs/app.log | wc -l
# Ratio = refine_count / total_count
```

### Dashboard метрик (если есть Grafana/Prometheus)

Рекомендуемые графики:
1. Average coverage score (за час/день)
2. Refine trigger rate (% запросов)
3. Generation time distribution (p50, p95, p99)
4. Token usage per request
5. Errors rate

## Acceptance Testing

### Чек-лист перед деплоем в production

- [ ] Базовый тест с полными данными: coverage > 0.85
- [ ] Тест с минимальными данными: не падает, генерирует структуру
- [ ] Все 3 языка работают (it, ru, en)
- [ ] Все 3 тона работают (professionale, informale, premium)
- [ ] Все 3 длины работают (short, medium, long)
- [ ] Санитайзер удаляет запрещённые термины
- [ ] Логи не содержат ERROR/WARN (кроме ожидаемых)
- [ ] Refine работает корректно (если enabled)
- [ ] Время генерации < 10 сек (p95)
- [ ] Fallback срабатывает при критических ошибках
- [ ] Rate limiting работает

## Отладка проблем

### Проблема: Низкий coverage score

**Решение:**
1. Проверить входные данные - достаточно ли информации в `userFields`?
2. Проверить логи `missingMustCover` - что конкретно пропущено?
3. Включить `AI_REFINE_ENABLED=true`
4. Увеличить `length` для большего контекста

### Проблема: Некорректная структура

**Решение:**
1. Проверить логи `paragraphCount` - сколько реально?
2. Проверить что модель gpt-4o-mini (не более старая)
3. Попробовать перегенерировать - возможно случайность

### Проблема: Запрещённые термины в output

**Решение:**
1. Проверить что санитайзер вызывается
2. Добавить термин в `prohibitedTerms` список
3. Логировать случаи нахождения для анализа

### Проблема: Слишком медленно

**Решение:**
1. Отключить `AI_REFINE_ENABLED`
2. Использовать `length: "short"`
3. Проверить OPENAI_BASE_URL - возможно проблемы с сетью
4. Рассмотреть caching похожих листингов

### Проблема: Смешанные языки

**Решение:**
1. Проверить параметр `locale` в запросе
2. Убедиться что модель поддерживает нужный язык
3. Попробовать более явные инструкции в system prompt

## Полезные команды

```bash
# Логи в реальном времени
tail -f logs/app.log | grep AiDraftService

# Фильтр только качественные метрики
tail -f logs/app.log | grep "quality metrics"

# Счётчик ошибок за последний час
grep ERROR logs/app.log | grep "$(date +%Y-%m-%d\ %H)" | wc -l

# Средняя длина description
grep "AI draft generated" logs/app.log | tail -100 | \
  # parse и подсчёт
```

## Тестовые данные

В папке `test/fixtures/` можно создать:
- `listing-full.json` - листинг со всеми полями
- `listing-minimal.json` - минимальный листинг
- `listing-premium.json` - премиум-листинг для теста тона premium

## CI/CD Integration

### Pre-commit тесты

```bash
npm run test:ai-generation
```

### Integration тесты

```bash
npm run test:e2e -- --grep "AI Draft Generation"
```

### Performance тесты

```bash
npm run test:perf -- ai-generation
```

Целевые метрики:
- p50 latency < 3 sec
- p95 latency < 8 sec
- Success rate > 98%
- Coverage score > 0.7 (average)

