import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Tone, Length } from '../../listings/dto/generate-draft.dto';

export interface PromptBuildRequest {
  listing: any; // полные данные листинга из БД
  locale: string;
  tone: Tone;
  length: Length;
}

export interface ContentPlan {
  intro: { targetWords: number };
  interni: { targetWords: number };
  esterni: { targetWords: number };
  zona: { targetWords: number };
  termini: { targetWords: number };
}

export interface MustCover {
  required: string[];
  optional: string[];
}

@Injectable()
export class AiPromptService {
  
  build(request: PromptBuildRequest): ChatCompletionMessageParam[] {
    const { listing, locale, tone, length } = request;
    const language = this.getLanguageFromLocale(locale);
    const contentPlan = this.generateContentPlan(length);
    const mustCover = this.generateMustCover(listing, language);
    
    // Few-shot pair (user + assistant example)
    const fewShotPair = this.buildFewShotPair(language);
    
    return [
      {
        role: 'system',
        content: this.buildSystemPrompt(locale, tone, length),
      },
      {
        role: 'developer',
        content: this.buildDeveloperPrompt(language, contentPlan),
      },
      // Few-shot examples
      ...fewShotPair,
      // Actual request
      {
        role: 'user',
        content: this.buildUserPrompt(listing, contentPlan, mustCover, language),
      },
    ];
  }

  generateContentPlan(length: Length): ContentPlan {
    // Целевое количество слов для каждой секции в зависимости от длины
    const baseWords = {
      [Length.SHORT]: { total: 200, intro: 30, interni: 50, esterni: 40, zona: 50, termini: 30 },
      [Length.MEDIUM]: { total: 350, intro: 60, interni: 90, esterni: 70, zona: 80, termini: 50 },
      [Length.LONG]: { total: 500, intro: 90, interni: 130, esterni: 100, zona: 110, termini: 70 },
    };

    const words = baseWords[length] || baseWords[Length.MEDIUM];

    return {
      intro: { targetWords: words.intro },
      interni: { targetWords: words.interni },
      esterni: { targetWords: words.esterni },
      zona: { targetWords: words.zona },
      termini: { targetWords: words.termini },
    };
  }

  generateMustCover(listing: any, language: string): MustCover {
    const required: string[] = [];
    const optional: string[] = [];

    const fields = listing.userFields || {};

    // Required items (если есть в данных)
    if (fields.city || fields.neighborhood) {
      required.push(language === 'it' ? 'città/quartiere' : language === 'ru' ? 'город/район' : 'city/neighborhood');
    }
    if (fields.squareMeters) {
      required.push(language === 'it' ? `superficie ${fields.squareMeters} m²` : language === 'ru' ? `площадь ${fields.squareMeters} м²` : `area ${fields.squareMeters} m²`);
    }
    if (fields.rooms || fields.bedrooms || fields.bathrooms) {
      const rooms = [fields.rooms && `${fields.rooms} locali`, fields.bedrooms && `${fields.bedrooms} camere`, fields.bathrooms && `${fields.bathrooms} bagni`].filter(Boolean).join(', ');
      if (rooms) required.push(language === 'it' ? rooms : language === 'ru' ? `планировка (${rooms})` : `layout (${rooms})`);
    }
    if (fields.floor !== undefined) {
      const floor = language === 'it' ? `piano ${fields.floor}` : language === 'ru' ? `этаж ${fields.floor}` : `floor ${fields.floor}`;
      const elevator = fields.elevator ? (language === 'it' ? 'con ascensore' : language === 'ru' ? 'с лифтом' : 'with elevator') : '';
      required.push(`${floor}${elevator ? ' ' + elevator : ''}`);
    }

    // Optional items
    if (fields.balcony || fields.terrace) {
      const outdoor = fields.balconySize 
        ? (language === 'it' ? `balcone ${fields.balconySize} m²` : language === 'ru' ? `балкон ${fields.balconySize} м²` : `balcony ${fields.balconySize} m²`)
        : (language === 'it' ? 'balcone/terrazza' : language === 'ru' ? 'балкон/терраса' : 'balcony/terrace');
      optional.push(outdoor);
    }
    if (fields.heating) {
      optional.push(language === 'it' ? `riscaldamento: ${fields.heating}` : language === 'ru' ? `отопление: ${fields.heating}` : `heating: ${fields.heating}`);
    }
    if (fields.energyClass) {
      optional.push(language === 'it' ? `classe energetica ${fields.energyClass}` : language === 'ru' ? `энергокласс ${fields.energyClass}` : `energy class ${fields.energyClass}`);
    }
    if (fields.walkingDistanceMetro || fields.walkingDistancePark || fields.walkingDistanceShops) {
      const distances = [];
      if (fields.walkingDistanceMetro) distances.push(language === 'it' ? `metro a ${fields.walkingDistanceMetro} min` : language === 'ru' ? `метро ${fields.walkingDistanceMetro} мин` : `metro ${fields.walkingDistanceMetro} min`);
      if (fields.walkingDistancePark) distances.push(language === 'it' ? `parco a ${fields.walkingDistancePark} min` : language === 'ru' ? `парк ${fields.walkingDistancePark} мин` : `park ${fields.walkingDistancePark} min`);
      if (fields.walkingDistanceShops) distances.push(language === 'it' ? `negozi a ${fields.walkingDistanceShops} min` : language === 'ru' ? `магазины ${fields.walkingDistanceShops} мин` : `shops ${fields.walkingDistanceShops} min`);
      optional.push(distances.join(', '));
    }
    if (fields.condoFees) {
      optional.push(language === 'it' ? `spese condominiali €${fields.condoFees}/mese` : language === 'ru' ? `кондо-платежи €${fields.condoFees}/мес` : `condo fees €${fields.condoFees}/month`);
    }

    return { required, optional };
  }

  private buildSystemPrompt(locale: string, tone: Tone, length: Length): string {
    const language = this.getLanguageFromLocale(locale);
    const toneInstructions = this.getToneInstructions(tone, language);

    if (language === 'it') {
      return `Sei un senior copywriter immobiliare specializzato nella creazione di annunci professionali in italiano.

REGOLE FONDAMENTALI:
- Scrivi in italiano fluente e naturale
- ${toneInstructions}
- Usa metrica (m²) e minuti a piedi
- Sii FATTUALE: ogni frase ≥1-2 fatti dai dati forniti

VIETATO INCLUDERE SE NON NEI DATI:
- Indirizzi completi, numeri civici, CAP, numeri appartamento
- Nomi di brand, catene commerciali, costruttori
- Materiali/finiture, IPE specifici, marche infissi
- Dettagli tecnici (portineria, videosorveglianza, impianti specifici)
- Garanzie ("garantito", "sicuro al 100%")
- Superlativi non dimostrabili ("migliore della zona", "unico")
- Discriminazione (famiglia, nazionalità, età)
- Dati personali del proprietario/arrendatore

AMMESSI:
- Formule prudenziali: "circa", "indicativamente", "secondo i dati forniti"
- Solo fatti esplicitamente presenti nei dati
- Metrature e tempi solo se numericamente indicati

Se un dato manca: ometti quella parte, NON inventare.`;
    } else if (language === 'ru') {
      return `Вы старший копирайтер по недвижимости, специализирующийся на создании профессиональных объявлений на русском языке.

ОСНОВНЫЕ ПРАВИЛА:
- Пишите на естественном русском языке
- ${toneInstructions}
- Используйте метрику (м²) и минуты пешком
- Будьте ФАКТОЛОГИЧНЫ: каждое предложение ≥1-2 факта из данных

ЗАПРЕЩЕНО ВКЛЮЧАТЬ ЕСЛИ НЕТ В ДАННЫХ:
- Полные адреса, номера домов, индексы, номера квартир
- Названия брендов, коммерческих сетей, застройщиков
- Материалы/отделка, конкретные IPE, марки окон
- Технические детали (консьерж, видеонаблюдение, конкретные системы)
- Гарантии ("гарантировано", "100% безопасно")
- Недоказуемые превосходные степени ("лучший в районе", "единственный")
- Дискриминация (семья, национальность, возраст)
- Персональные данные владельца/арендатора

ДОПУСТИМО:
- Осторожные формулировки: "около", "ориентировочно", "по предоставленным данным"
- Только факты явно присутствующие в данных
- Площади и время только если указаны численно

Если данных нет: опустите эту часть, НЕ придумывайте.`;
    } else { // English fallback
      return `You are a senior real-estate copywriter specialized in creating professional listings in English.

FUNDAMENTAL RULES:
- Write in fluent and natural English
- ${toneInstructions}
- Use metrics (m²) and walking minutes
- Be FACTUAL: every sentence ≥1-2 facts from provided data

FORBIDDEN TO INCLUDE IF NOT IN DATA:
- Complete addresses, street numbers, postal codes, apartment numbers
- Brand names, commercial chains, developers
- Materials/finishes, specific IPE, window brands
- Technical details (concierge, video surveillance, specific systems)
- Guarantees ("guaranteed", "100% safe")
- Unprovable superlatives ("best in area", "unique")
- Discrimination (family, nationality, age)
- Personal data of owner/tenant

ALLOWED:
- Prudential formulas: "approximately", "indicatively", "according to data provided"
- Only facts explicitly present in data
- Areas and times only if numerically indicated

If data is missing: omit that part, DO NOT invent.`;
    }
  }

  private buildDeveloperPrompt(language: string, contentPlan: ContentPlan): string {
    const sections = language === 'it' 
      ? ['Intro', 'Interni', 'Esterni/Servizi', 'Zona/Trasporti', 'Termini']
      : language === 'ru'
      ? ['Intro', 'Interni (внутренние)', 'Esterni/Servizi (внешние/услуги)', 'Zona/Trasporti (район/транспорт)', 'Termini (условия)']
      : ['Intro', 'Interni (interiors)', 'Esterni/Servizi (exteriors/amenities)', 'Zona/Trasporti (location/transport)', 'Termini (terms)'];

    const instrText = language === 'it'
      ? `CONTRATTO STRUTTURALE - RISPETTA RIGOROSAMENTE:

JSON Schema:
{
  "title": "string",
  "summary": "string",
  "description": "string",
  "highlights": ["string"],
  "disclaimer": "string",
  "seo": { "keywords": ["string"], "metaDescription": "string" }
}

DESCRIPTION - 5 PARAGRAFI ESATTI in quest'ordine:
1. ${sections[0]} (~${contentPlan.intro.targetWords} parole, ±10%): hook + overview
2. ${sections[1]} (~${contentPlan.interni.targetWords} parole): spazi interni, layout, finiture
3. ${sections[2]} (~${contentPlan.esterni.targetWords} parole): balconi/terrazze, aree esterne, servizi condominiali
4. ${sections[3]} (~${contentPlan.zona.targetWords} parole): quartiere, trasporti, POI con distanze a piedi
5. ${sections[4]} (~${contentPlan.termini.targetWords} parole): prezzo, spese, disponibilità, condizioni

- Ogni paragrafo separato da \\n\\n
- Ogni paragrafo ≥2 fatti concreti dall'input
- Se dati per una sezione mancano, scrivi comunque il paragrafo ma breve (20-30 parole)

HIGHLIGHTS:
- 5-7 elementi
- Ogni elemento 3-10 parole
- Formato: "Fatto concreto + dettaglio" (es. "Balcone 8 m² affaccio su giardino")
- NO frasi generiche ("ottima posizione"), SI specificità ("Metro a 3 min a piedi")

SEO:
- keywords: 5-8 termini rilevanti e cercabili
- metaDescription: 120-160 caratteri, include città/tipo/prezzo

VIETATO:
- Campi JSON extra o mancanti
- Markdown, emoji, caratteri speciali non necessari
- Inventare dati non presenti nell'input
- Garanzie ("garantito", "sicuro al 100%"), discriminazione, superlativi non provabili`
      : language === 'ru'
      ? `СТРУКТУРНЫЙ КОНТРАКТ - СТРОГО СОБЛЮДАЙТЕ:

JSON Schema:
{
  "title": "string",
  "summary": "string",
  "description": "string",
  "highlights": ["string"],
  "disclaimer": "string",
  "seo": { "keywords": ["string"], "metaDescription": "string" }
}

DESCRIPTION - РОВНО 5 ПАРАГРАФОВ в этом порядке:
1. ${sections[0]} (~${contentPlan.intro.targetWords} слов, ±10%): хук + обзор
2. ${sections[1]} (~${contentPlan.interni.targetWords} слов): внутренние пространства, планировка, отделка
3. ${sections[2]} (~${contentPlan.esterni.targetWords} слов): балконы/террасы, внешние зоны, услуги кондо
4. ${sections[3]} (~${contentPlan.zona.targetWords} слов): район, транспорт, POI с расстояниями пешком
5. ${sections[4]} (~${contentPlan.termini.targetWords} слов): цена, платежи, доступность, условия

- Каждый параграф разделен \\n\\n
- Каждый параграф ≥2 конкретных факта из входных данных
- Если данных для секции нет, всё равно напишите короткий параграф (20-30 слов)

HIGHLIGHTS:
- 5-7 элементов
- Каждый 3-10 слов
- Формат: "Конкретный факт + детали" (напр. "Балкон 8 м² с видом на сад")
- НЕТ общих фраз ("отличное расположение"), ДА конкретика ("Метро в 3 мин пешком")

SEO:
- keywords: 5-8 релевантных поисковых терминов
- metaDescription: 120-160 символов, включая город/тип/цену

ЗАПРЕЩЕНО:
- Лишние или отсутствующие поля JSON
- Markdown, эмодзи, ненужные спецсимволы
- Придумывание данных, отсутствующих во входных данных
- Гарантии ("гарантировано", "100% безопасно"), дискриминация, недоказуемые превосходные степени`
      : `STRUCTURAL CONTRACT - STRICTLY FOLLOW:

JSON Schema:
{
  "title": "string",
  "summary": "string",
  "description": "string",
  "highlights": ["string"],
  "disclaimer": "string",
  "seo": { "keywords": ["string"], "metaDescription": "string" }
}

DESCRIPTION - EXACTLY 5 PARAGRAPHS in this order:
1. ${sections[0]} (~${contentPlan.intro.targetWords} words, ±10%): hook + overview
2. ${sections[1]} (~${contentPlan.interni.targetWords} words): interior spaces, layout, finishes
3. ${sections[2]} (~${contentPlan.esterni.targetWords} words): balconies/terraces, outdoor areas, building amenities
4. ${sections[3]} (~${contentPlan.zona.targetWords} words): neighborhood, transport, POI with walking distances
5. ${sections[4]} (~${contentPlan.termini.targetWords} words): price, fees, availability, terms

- Each paragraph separated by \\n\\n
- Each paragraph ≥2 concrete facts from input
- If data for section missing, still write brief paragraph (20-30 words)

HIGHLIGHTS:
- 5-7 items
- Each 3-10 words
- Format: "Concrete fact + detail" (e.g. "8 m² balcony garden view")
- NO generic phrases ("great location"), YES specifics ("Metro 3 min walk")

SEO:
- keywords: 5-8 relevant searchable terms
- metaDescription: 120-160 characters, include city/type/price

FORBIDDEN:
- Extra or missing JSON fields
- Markdown, emoji, unnecessary special characters
- Inventing data not in input
- Guarantees ("guaranteed", "100% safe"), discrimination, unprovable superlatives`;

    return instrText;
  }

  private buildUserPrompt(listing: any, contentPlan: ContentPlan, mustCover: MustCover, language: string): string {
    const listingData = {
      id: listing.id,
      type: listing.type, // SALE or RENT
      propertyType: listing.propertyType,
      title: listing.title,
      price: listing.price,
      userFields: listing.userFields || {},
    };

    const promptText = language === 'it'
      ? `Crea un annuncio immobiliare per questa proprietà.

DATI PROPRIETÀ:
${JSON.stringify(listingData, null, 2)}

PIANO DEI CONTENUTI (target parole per paragrafo):
${JSON.stringify(contentPlan, null, 2)}

MUST COVER (obbligatori se presenti):
${mustCover.required.length > 0 ? mustCover.required.join('; ') : 'Nessuno'}

OPZIONALI (se presenti):
${mustCover.optional.length > 0 ? mustCover.optional.join('; ') : 'Nessuno'}

IMPORTANTE: 
- Usa SOLO i dati sopra riportati
- Se un dato manca (indirizzo, materiali, brand, ecc.) NON inventarlo
- Rispetta rigorosamente il contratto strutturale JSON
- Mantieni le etichette di sezione (Intro:, Interni:, etc.) all'inizio di ogni paragrafo`
      : language === 'ru'
      ? `Создайте объявление о недвижимости для этой собственности.

ДАННЫЕ НЕДВИЖИМОСТИ:
${JSON.stringify(listingData, null, 2)}

ПЛАН КОНТЕНТА (целевые слова на параграф):
${JSON.stringify(contentPlan, null, 2)}

MUST COVER (обязательно если есть):
${mustCover.required.length > 0 ? mustCover.required.join('; ') : 'Нет'}

ОПЦИОНАЛЬНО (если есть):
${mustCover.optional.length > 0 ? mustCover.optional.join('; ') : 'Нет'}

ВАЖНО:
- Используйте ТОЛЬКО данные указанные выше
- Если данных нет (адрес, материалы, бренды и т.п.) НЕ придумывайте
- Строго соблюдайте структурный контракт JSON
- Сохраняйте метки секций (Intro:, Interni:, etc.) в начале каждого параграфа`
      : `Create a real estate listing for this property.

PROPERTY DATA:
${JSON.stringify(listingData, null, 2)}

CONTENT PLAN (target words per paragraph):
${JSON.stringify(contentPlan, null, 2)}

MUST COVER (required if present):
${mustCover.required.length > 0 ? mustCover.required.join('; ') : 'None'}

OPTIONAL (if present):
${mustCover.optional.length > 0 ? mustCover.optional.join('; ') : 'None'}

IMPORTANT:
- Use ONLY the data provided above
- If data is missing (address, materials, brands, etc.) DO NOT invent it
- Strictly follow the JSON structural contract
- Keep section labels (Intro:, Interni:, etc.) at start of each paragraph`;

    return promptText;
  }

  buildFewShotPair(language: string): ChatCompletionMessageParam[] {
    if (language === 'it') {
      return [
        {
          role: 'user',
          content: `Facts:
- Tipo: vendita, tipologia: trilocale
- Superficie: 72 m²
- Piano: 3° con ascensore
- Spazi esterni: balcone 8 m²
- Riscaldamento: centralizzato; Classe energetica: C
- Zona: Navigli (Milano)
- Distanze a piedi: metro 5 min, parco 1 min
- Spese condominiali: €150/mese
- Prezzo: su richiesta`
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            title: "Trilocale 72 m² con balcone, 3° piano con ascensore — Navigli",
            summary: "In zona Navigli, trilocale di 72 m² al 3° piano con ascensore. Balcone 8 m², riscaldamento centralizzato, classe C. Metro a 5 minuti a piedi; area verde a 1 minuto. Spese condominiali €150/mese. Prezzo su richiesta.",
            description: "Intro: Trilocale funzionale di 72 m² nel cuore dei Navigli, al terzo piano di stabile servito da ascensore, ideale per chi desidera servizi e collegamenti a portata di mano.\n\nInterni: Soggiorno con zona pranzo e cucina, due camere e bagno. Ambienti luminosi e ben distribuiti; riscaldamento centralizzato; classe energetica C.\n\nEsterni/Servizi: Balcone vivibile di 8 m², utile per colazioni all'aperto. Stabile ben tenuto con servizi condominiali.\n\nZona/Trasporti: Negozi e locali nelle vicinanze; metropolitana raggiungibile in circa 5 minuti a piedi; area verde a 1 minuto per passeggiate e sport.\n\nTermini essenziali: Spese condominiali €150/mese; prezzo su richiesta. Informazioni indicative e non vincolanti.",
            highlights: [
              "72 m² 3° piano con ascensore",
              "Balcone 8 m²",
              "Classe energetica C",
              "Metro a 5 minuti",
              "Spese cond. €150/mese"
            ],
            disclaimer: "Le informazioni sono indicative e non costituiscono elemento contrattuale.",
            seo: {
              keywords: ["trilocale", "Navigli", "Milano", "balcone", "ascensore", "classe C"],
              metaDescription: "Trilocale 72 m² con balcone ai Navigli, 3° piano con ascensore e classe C. Metro a 5 minuti. Spese condominiali €150/mese. Prezzo su richiesta."
            }
          }, null, 0)
        }
      ];
    } else if (language === 'ru') {
      return [
        {
          role: 'user',
          content: `Facts:
- Тип: продажа, типология: трехкомнатная
- Площадь: 72 м²
- Этаж: 3 с лифтом
- Открытые пространства: балкон 8 м²
- Отопление: централизованное; Энергокласс: C
- Район: Навильи (Милан)
- Расстояния пешком: метро 5 мин, парк 1 мин
- Кондо-платежи: €150/мес
- Цена: по запросу`
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            title: "Трехкомнатная 72 м² с балконом, 3 этаж с лифтом — Навильи",
            summary: "В районе Навильи, трехкомнатная квартира 72 м² на 3 этаже с лифтом. Балкон 8 м², централизованное отопление, класс C. Метро в 5 минутах пешком; зеленая зона в 1 минуте. Кондо-платежи €150/мес. Цена по запросу.",
            description: "Intro: Функциональная трехкомнатная квартира 72 м² в сердце Навильи, на третьем этаже здания с лифтом, идеальна для тех, кто ценит услуги и транспорт в шаговой доступности.\n\nInterni: Гостиная с обеденной зоной и кухней, две спальни и ванная комната. Светлые и хорошо распределенные помещения; централизованное отопление; энергокласс C.\n\nEsterni/Servizi: Жилой балкон 8 м², удобный для завтраков на свежем воздухе. Ухоженное здание с кондоминиумными услугами.\n\nZona/Trasporti: Магазины и заведения поблизости; метро в примерно 5 минутах пешком; зеленая зона в 1 минуте для прогулок и спорта.\n\nTermini: Кондо-платежи €150/мес; цена по запросу. Информация ориентировочная и не является обязательством.",
            highlights: [
              "72 м² 3 этаж с лифтом",
              "Балкон 8 м²",
              "Энергокласс C",
              "Метро 5 минут",
              "Кондо €150/мес"
            ],
            disclaimer: "Информация носит ориентировочный характер и не является договорным обязательством.",
            seo: {
              keywords: ["трехкомнатная", "Навильи", "Милан", "балкон", "лифт", "класс C"],
              metaDescription: "Трехкомнатная 72 м² с балконом в Навильи, 3 этаж с лифтом и класс C. Метро 5 минут. Кондо-платежи €150/мес. Цена по запросу."
            }
          }, null, 0)
        }
      ];
    } else { // English
      return [
        {
          role: 'user',
          content: `Facts:
- Type: sale, property: 3-room apartment
- Area: 72 m²
- Floor: 3rd with elevator
- Outdoor spaces: balcony 8 m²
- Heating: centralized; Energy class: C
- Area: Navigli (Milan)
- Walking distances: metro 5 min, park 1 min
- Condo fees: €150/month
- Price: on request`
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            title: "3-room 72 m² with balcony, 3rd floor with elevator — Navigli",
            summary: "In Navigli area, 3-room apartment of 72 m² on 3rd floor with elevator. Balcony 8 m², centralized heating, class C. Metro 5 minutes walk; green area 1 minute away. Condo fees €150/month. Price on request.",
            description: "Intro: Functional 3-room apartment of 72 m² in the heart of Navigli, on third floor of building with elevator, ideal for those who want services and connections within reach.\n\nInterni: Living room with dining area and kitchen, two bedrooms and bathroom. Bright and well-distributed spaces; centralized heating; energy class C.\n\nEsterni/Servizi: Livable balcony of 8 m², useful for outdoor breakfasts. Well-maintained building with condominium services.\n\nZona/Trasporti: Shops and venues nearby; metro reachable in about 5 minutes walk; green area 1 minute away for walks and sports.\n\nTermini: Condo fees €150/month; price on request. Information is indicative and non-binding.",
            highlights: [
              "72 m² 3rd floor with elevator",
              "Balcony 8 m²",
              "Energy class C",
              "Metro 5 minutes",
              "Condo fees €150/month"
            ],
            disclaimer: "The information is indicative and does not constitute a contractual obligation.",
            seo: {
              keywords: ["3-room", "Navigli", "Milan", "balcony", "elevator", "class C"],
              metaDescription: "3-room 72 m² with balcony in Navigli, 3rd floor with elevator and class C. Metro 5 minutes. Condo fees €150/month. Price on request."
            }
          }, null, 0)
        }
      ];
    }
  }

  buildRefinePrompt(
    listing: any,
    draft: any,
    contentPlan: ContentPlan,
    mustCover: MustCover,
    language: string
  ): ChatCompletionMessageParam[] {
    return [
      {
        role: 'system',
        content: this.buildRefineSystemPrompt(language),
      },
      {
        role: 'developer',
        content: this.buildRefineDeveloperPrompt(language, contentPlan, mustCover),
      },
      {
        role: 'user',
        content: this.buildRefineUserPrompt(listing, draft, language),
      },
    ];
  }

  private buildRefineSystemPrompt(language: string): string {
    if (language === 'it') {
      return `Sei un meticoloso editor immobiliare specializzato nel perfezionamento di annunci.

OBIETTIVO:
Migliorare il draft esistente mantenendo lo stesso schema JSON. Rendere il testo più denso e concreto, garantire che ogni sezione rispetti il target di parole, e assicurare che tutti gli elementi mustCover siano presenti (SE e SOLO SE presenti nei dati di input).

REGOLE ASSOLUTE:
- NON inventare MAI nuovi dati non presenti nell'input originale
- Usa solo i fatti già presenti nel draft o nei dati di input
- Se mustCover mancanti sono nei dati originali, aggiungili
- Mantieni lo stesso schema JSON
- Rendi il linguaggio più conciso e fattuale
- Giuridicamente sicuro, non discriminatorio`;
    } else if (language === 'ru') {
      return `Вы дотошный редактор объявлений о недвижимости, специализирующийся на совершенствовании черновиков.

ЦЕЛЬ:
Улучшить существующий черновик, сохраняя ту же JSON-схему. Сделать текст более плотным и конкретным, убедиться что каждая секция соответствует целевому объему слов, и гарантировать что все элементы mustCover присутствуют (ЕСЛИ и ТОЛЬКО ЕСЛИ они есть во входных данных).

АБСОЛЮТНЫЕ ПРАВИЛА:
- НИКОГДА не придумывайте новые данные, отсутствующие во входных данных
- Используйте только факты, уже присутствующие в черновике или входных данных
- Если отсутствующие mustCover есть в исходных данных, добавьте их
- Сохраняйте ту же JSON-схему
- Сделайте язык более кратким и фактологичным
- Юридически безопасно, без дискриминации`;
    } else {
      return `You are a meticulous real-estate editor specialized in refining draft listings.

OBJECTIVE:
Improve the existing draft while keeping the same JSON schema. Make the text denser and more concrete, ensure each section meets word targets, and verify all mustCover items are present (IF and ONLY IF present in input data).

ABSOLUTE RULES:
- NEVER invent new data not in original input
- Use only facts already in draft or input data
- If missing mustCover items are in original data, add them
- Keep same JSON schema
- Make language more concise and factual
- Legally safe, non-discriminatory`;
    }
  }

  private buildRefineDeveloperPrompt(language: string, contentPlan: ContentPlan, mustCover: MustCover): string {
    if (language === 'it') {
      return `Migliora il draft mantenendo lo stesso schema JSON.

OBIETTIVI DI MIGLIORAMENTO:
1. Densità: ogni paragrafo deve contenere ≥2 fatti concreti
2. Lunghezza: rispetta i target di parole per ogni sezione (±10%)
3. Copertura: assicurati che tutti i mustCover siano presenti (se nei dati originali)
4. Concisione: elimina frasi generiche, sostituiscile con specificità

PIANO DEI CONTENUTI (target parole):
${JSON.stringify(contentPlan, null, 2)}

ELEMENTI OBBLIGATORI DA VERIFICARE:
${mustCover.required.join(', ')}

ELEMENTI OPZIONALI DA INCLUDERE (se presenti):
${mustCover.optional.join(', ')}

NON aggiungere fatti non presenti nell'input originale. Usa SOLO i dati forniti.`;
    } else if (language === 'ru') {
      return `Улучшите черновик, сохраняя ту же JSON-схему.

ЦЕЛИ УЛУЧШЕНИЯ:
1. Плотность: каждый параграф должен содержать ≥2 конкретных факта
2. Длина: соблюдайте целевые объемы для каждой секции (±10%)
3. Покрытие: убедитесь что все mustCover присутствуют (если в исходных данных)
4. Краткость: устраните общие фразы, замените их конкретикой

ПЛАН КОНТЕНТА (целевые слова):
${JSON.stringify(contentPlan, null, 2)}

ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ДЛЯ ПРОВЕРКИ:
${mustCover.required.join(', ')}

ОПЦИОНАЛЬНЫЕ ЭЛЕМЕНТЫ ДЛЯ ВКЛЮЧЕНИЯ (если есть):
${mustCover.optional.join(', ')}

НЕ добавляйте факты, отсутствующие в исходных данных. Используйте ТОЛЬКО предоставленные данные.`;
    } else {
      return `Improve the draft while keeping the same JSON schema.

IMPROVEMENT OBJECTIVES:
1. Density: each paragraph must contain ≥2 concrete facts
2. Length: meet word targets for each section (±10%)
3. Coverage: ensure all mustCover items present (if in original data)
4. Conciseness: eliminate generic phrases, replace with specifics

CONTENT PLAN (target words):
${JSON.stringify(contentPlan, null, 2)}

REQUIRED ITEMS TO VERIFY:
${mustCover.required.join(', ')}

OPTIONAL ITEMS TO INCLUDE (if present):
${mustCover.optional.join(', ')}

DO NOT add facts not in original input. Use ONLY provided data.`;
    }
  }

  private buildRefineUserPrompt(listing: any, draft: any, language: string): string {
    const listingData = {
      id: listing.id,
      type: listing.type,
      propertyType: listing.propertyType,
      title: listing.title,
      price: listing.price,
      userFields: listing.userFields || {},
    };

    if (language === 'it') {
      return `DATI ORIGINALI DELLA PROPRIETÀ:
${JSON.stringify(listingData, null, 2)}

DRAFT DA MIGLIORARE:
${JSON.stringify(draft, null, 2)}

Migliora questo draft: rendilo più denso e concreto, rispetta i target di parole per ogni sezione, assicurati che tutti i mustCover siano presenti. NON inventare nuovi dati - usa solo quanto presente nei dati originali.`;
    } else if (language === 'ru') {
      return `ИСХОДНЫЕ ДАННЫЕ НЕДВИЖИМОСТИ:
${JSON.stringify(listingData, null, 2)}

ЧЕРНОВИК ДЛЯ УЛУЧШЕНИЯ:
${JSON.stringify(draft, null, 2)}

Улучшите этот черновик: сделайте его более плотным и конкретным, соблюдайте целевые объемы для каждой секции, убедитесь что все mustCover присутствуют. НЕ придумывайте новые данные - используйте только то, что есть в исходных данных.`;
    } else {
      return `ORIGINAL PROPERTY DATA:
${JSON.stringify(listingData, null, 2)}

DRAFT TO IMPROVE:
${JSON.stringify(draft, null, 2)}

Improve this draft: make it denser and more concrete, meet word targets for each section, ensure all mustCover items present. DO NOT invent new data - use only what's in original data.`;
    }
  }

  private getLanguageFromLocale(locale: string): string {
    const langCode = locale.split('-')[0].toLowerCase();
    switch (langCode) {
      case 'it': return 'it';
      case 'ru': return 'ru';
      case 'en': return 'en';
      default: return 'it'; // default to Italian
    }
  }

  private getToneInstructions(tone: Tone, language: string): string {
    if (language === 'it') {
      switch (tone) {
        case Tone.PROFESSIONALE:
          return 'Usa un tono professionale, formale e competente';
        case Tone.INFORMALE:
          return 'Usa un tono amichevole, informale e colloquiale';
        case Tone.PREMIUM:
          return 'Usa un tono elegante, esclusivo e di lusso';
        default:
          return 'Usa un tono professionale';
      }
    } else if (language === 'ru') {
      switch (tone) {
        case Tone.PROFESSIONALE:
          return 'Используйте профессиональный, формальный и компетентный тон';
        case Tone.INFORMALE:
          return 'Используйте дружелюбный, неформальный и разговорный тон';
        case Tone.PREMIUM:
          return 'Используйте элегантный, эксклюзивный и роскошный тон';
        default:
          return 'Используйте профессиональный тон';
      }
    } else { // English
      switch (tone) {
        case Tone.PROFESSIONALE:
          return 'Use a professional, formal and competent tone';
        case Tone.INFORMALE:
          return 'Use a friendly, informal and conversational tone';
        case Tone.PREMIUM:
          return 'Use an elegant, exclusive and luxury tone';
        default:
          return 'Use a professional tone';
      }
    }
  }

  private getLengthInstructions(length: Length, language: string): string {
    if (language === 'it') {
      switch (length) {
        case Length.SHORT:
          return 'Mantieni le descrizioni concise e dirette';
        case Length.MEDIUM:
          return 'Usa descrizioni di lunghezza media, equilibrate';
        case Length.LONG:
          return 'Crea descrizioni dettagliate e approfondite';
        default:
          return 'Usa descrizioni di lunghezza media';
      }
    } else if (language === 'ru') {
      switch (length) {
        case Length.SHORT:
          return 'Делайте описания краткими и прямыми';
        case Length.MEDIUM:
          return 'Используйте описания средней длины, сбалансированные';
        case Length.LONG:
          return 'Создавайте детальные и углубленные описания';
        default:
          return 'Используйте описания средней длины';
      }
    } else { // English
      switch (length) {
        case Length.SHORT:
          return 'Keep descriptions concise and direct';
        case Length.MEDIUM:
          return 'Use medium-length, balanced descriptions';
        case Length.LONG:
          return 'Create detailed and in-depth descriptions';
        default:
          return 'Use medium-length descriptions';
      }
    }
  }
}
