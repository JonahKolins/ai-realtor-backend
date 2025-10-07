# Миграция на улучшенную систему AI генерации (V2)

## Что изменилось

### Для разработчиков

**Публичный API НЕ изменился** - все существующие вызовы продолжат работать.

**Внутренние изменения:**
1. `AiPromptService` - новые методы `generateContentPlan()` и `generateMustCover()`
2. `AiDraftService` - двухпроходная генерация + пост-линтер
3. `AiOpenaiService` - новые параметры запроса (temperature, frequency_penalty, top_p)
4. `ai.config.ts` - новые настройки refineEnabled и qualityThreshold

### Для DevOps

**Новые переменные окружения:**
```bash
# Опциональные, имеют значения по умолчанию
AI_REFINE_ENABLED=false        # Включить двухпроходную генерацию
AI_QUALITY_THRESHOLD=0.7       # Порог качества для refine (0.0-1.0)
```

## Шаги миграции

### 1. Обновить код

```bash
git pull origin main
```

### 2. Установить зависимости (если были изменения)

```bash
npm install
```

### 3. Обновить .env файл

Добавить в `.env` (опционально):

```bash
# AI Content Generation (новое)
AI_REFINE_ENABLED=false        # Оставьте false для начала
AI_QUALITY_THRESHOLD=0.7
```

### 4. Перезапустить сервер

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm run start:prod
```

### 5. Проверить работоспособность

Отправить тестовый запрос:

```bash
POST http://localhost:4000/api/v1/listings/{id}/generate-draft
Content-Type: application/json

{
  "locale": "it-IT",
  "tone": "professionale",
  "length": "medium"
}
```

Ожидаемый результат:
- Статус 200
- JSON с 5 параграфами в description
- 5-7 highlights
- Логи содержат качественные метрики

### 6. Включить refine (опционально)

Если качество текстов устраивает, но хочется ещё лучше:

```bash
AI_REFINE_ENABLED=true
AI_QUALITY_THRESHOLD=0.7
```

**ВАЖНО:** Это увеличит расход токенов в ~1.5-2 раза!

## Проверка качества

### В логах сервера ищите:

```
[AiDraftService] Draft quality metrics {
  coverageScore: 0.85,
  structureValid: true,
  paragraphCount: 5,
  highlightsCount: 6,
  missingMustCover: []
}
```

**Хорошие метрики:**
- `coverageScore` > 0.7
- `structureValid: true`
- `paragraphCount: 5`
- `highlightsCount: 5-7`

**Плохие метрики:**
- `coverageScore` < 0.5
- `paragraphCount` !== 5
- `missingMustCover` длинный список

→ Включите `AI_REFINE_ENABLED=true`

## Rollback (если нужно)

Если возникли проблемы:

```bash
git checkout <previous-commit>
npm install
npm run build
npm run start:prod
```

Или просто отключите новые функции:

```bash
AI_REFINE_ENABLED=false
```

## Мониторинг

### Метрики для отслеживания

1. **Время генерации:**
   - Без refine: ~2-5 сек
   - С refine: ~4-10 сек

2. **Расход токенов:**
   - Без refine: ~500-1500 tokens
   - С refine: ~1000-3000 tokens

3. **Качество (coverage score):**
   - Целевое значение: > 0.7
   - Отлично: > 0.85

4. **Частота refine:**
   - Если > 50% запросов требуют refine → нужно улучшить входные данные

### Alerts

Рекомендуем настроить алерты на:
- Средний coverage score < 0.6 за последний час
- > 80% запросов требуют refine pass
- Средняя длина генерации > 15 сек

## FAQ

### Q: Нужно ли мигрировать сразу?

A: Нет, изменения обратно совместимы. Можете мигрировать постепенно.

### Q: Изменится ли формат ответа API?

A: Нет, формат `ListingDraftDto` остался прежним.

### Q: Станет ли медленнее?

A: С `AI_REFINE_ENABLED=false` - незначительно (~5-10%).
С `AI_REFINE_ENABLED=true` - да, в ~1.5-2 раза медленнее, но качество лучше.

### Q: Увеличится ли расход токенов?

A: С `AI_REFINE_ENABLED=false` - минимально.
С `AI_REFINE_ENABLED=true` - да, в ~1.5-2 раза.

### Q: Что если у листинга мало данных?

A: Система адаптируется - если mustCover элементы отсутствуют, они не будут требоваться. Fallback сработает при критических ошибках.

### Q: Как проверить что новая система работает?

A: Проверьте логи - должны появиться строки:
```
[AiDraftService] Draft quality metrics ...
[AiDraftService] AI draft generated successfully { finalCoverageScore: 0.85 }
```

### Q: Могу ли я вернуться к старой версии?

A: Да, через git rollback или отключив новые фичи через ENV.

## Поддержка

Вопросы и проблемы:
- GitHub Issues: [ссылка]
- Email: [email]
- Slack: #ai-realtor-support

## Changelog

**v2.0.0 - AI Content Generation Upgrade**
- ✨ Контент-план с 5 секциями и целевыми объёмами
- ✨ Автоматический расчёт mustCover элементов
- ✨ Жёсткий контракт структуры и формата
- ✨ Few-shot обучение с примерами
- ✨ Двухпроходная генерация (draft → refine)
- ✨ Пост-линтер качества
- ✨ Улучшенный санитайзер
- 🔧 Параметры модели (temperature, frequency_penalty, top_p)
- 📝 Детальная документация

**Backwards Compatible:** ✅ Да

