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
    
    return [
      {
        role: 'system',
        content: this.buildSystemPrompt(locale, tone, length),
      },
      {
        role: 'developer',
        content: this.buildDeveloperPrompt(language, contentPlan),
      },
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
      return `Sei un senior copywriter immobiliare specializzato nella creazione di annunci immobiliari professionali e densi di contenuto in italiano.

REGOLE GENERALI:
- Scrivi sempre in italiano fluente e naturale
- ${toneInstructions}
- Sii CONCRETO e FATTUALE: ogni frase deve contenere almeno 1-2 fatti specifici dai dati forniti
- Usa unità metriche (m²) e minuti a piedi per le distanze
- NON inventare MAI informazioni non fornite - se mancano dati, ometti quella sezione
- Usa linguaggio inclusivo, rispettoso e giuridicamente sicuro
- VIETATO: garanzie assolute, superlativi non dimostrabili, discriminazione, termini medici
- Niente markdown, emoji o campi extra nel JSON

DENSITÀ DEL CONTENUTO:
- Ogni paragrafo deve contenere ≥2 fatti concreti
- Evita frasi generiche come "ottima posizione" senza specificare perché
- Preferisci "balcone 8 m² affaccio su giardino" a "bel balcone"`;
    } else if (language === 'ru') {
      return `Вы старший копирайтер по недвижимости, специализирующийся на создании профессиональных и насыщенных фактами объявлений о недвижимости на русском языке.

ОБЩИЕ ПРАВИЛА:
- Всегда пишите на естественном русском языке
- ${toneInstructions}
- Будьте КОНКРЕТНЫ и ФАКТОЛОГИЧНЫ: каждое предложение должно содержать ≥1-2 факта из предоставленных данных
- Используйте метрические единицы (м²) и минуты пешком для расстояний
- НИКОГДА не придумывайте информацию - если данных нет, опустите эту секцию
- Используйте инклюзивный, уважительный и юридически безопасный язык
- ЗАПРЕЩЕНО: абсолютные гарантии, недоказуемые превосходные степени, дискриминация, медицинские термины
- Никакого markdown, эмодзи или лишних полей в JSON

ПЛОТНОСТЬ КОНТЕНТА:
- Каждый параграф должен содержать ≥2 конкретных факта
- Избегайте общих фраз вроде "отличное расположение" без конкретики
- Предпочитайте "балкон 8 м² с видом на сад" вместо "хороший балкон"`;
    } else { // English fallback
      return `You are a senior real-estate copywriter specialized in creating professional, fact-dense real estate listings in English.

GENERAL RULES:
- Always write in fluent and natural English
- ${toneInstructions}
- Be CONCRETE and FACTUAL: every sentence must contain ≥1-2 specific facts from provided data
- Use metric units (m²) and walking minutes for distances
- NEVER invent information not provided - if data is missing, omit that section
- Use inclusive, respectful and legally safe language
- FORBIDDEN: absolute guarantees, unprovable superlatives, discrimination, medical claims
- No markdown, emoji or extra JSON fields

CONTENT DENSITY:
- Each paragraph must contain ≥2 concrete facts
- Avoid generic phrases like "great location" without specifics
- Prefer "8 m² balcony overlooking garden" to "nice balcony"`;
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

    const fewShotExample = this.getFewShotExample(language);

    const promptText = language === 'it'
      ? `Crea un annuncio immobiliare denso di contenuto per questa proprietà.

DATI PROPRIETÀ:
${JSON.stringify(listingData, null, 2)}

PIANO DEI CONTENUTI (obiettivi di parole per paragrafo):
${JSON.stringify(contentPlan, null, 2)}

ELEMENTI DA COPRIRE OBBLIGATORIAMENTE (se presenti nei dati):
${mustCover.required.length > 0 ? mustCover.required.join(', ') : 'Nessuno'}

ELEMENTI OPZIONALI DA INCLUDERE (se presenti):
${mustCover.optional.length > 0 ? mustCover.optional.join(', ') : 'Nessuno'}

${fewShotExample}

Ora genera l'annuncio per la proprietà sopra, seguendo rigorosamente il contratto strutturale.`
      : language === 'ru'
      ? `Создайте насыщенное объявление о недвижимости для этой собственности.

ДАННЫЕ НЕДВИЖИМОСТИ:
${JSON.stringify(listingData, null, 2)}

ПЛАН КОНТЕНТА (целевые слова для параграфов):
${JSON.stringify(contentPlan, null, 2)}

ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ДЛЯ ОСВЕЩЕНИЯ (если есть в данных):
${mustCover.required.length > 0 ? mustCover.required.join(', ') : 'Нет'}

ОПЦИОНАЛЬНЫЕ ЭЛЕМЕНТЫ ДЛЯ ВКЛЮЧЕНИЯ (если есть):
${mustCover.optional.length > 0 ? mustCover.optional.join(', ') : 'Нет'}

${fewShotExample}

Теперь создайте объявление для указанной выше недвижимости, строго следуя структурному контракту.`
      : `Create a fact-dense real estate listing for this property.

PROPERTY DATA:
${JSON.stringify(listingData, null, 2)}

CONTENT PLAN (target words per paragraph):
${JSON.stringify(contentPlan, null, 2)}

MUST COVER ITEMS (if present in data):
${mustCover.required.length > 0 ? mustCover.required.join(', ') : 'None'}

OPTIONAL ITEMS TO INCLUDE (if present):
${mustCover.optional.length > 0 ? mustCover.optional.join(', ') : 'None'}

${fewShotExample}

Now generate the listing for the above property, strictly following the structural contract.`;

    return promptText;
  }

  private getFewShotExample(language: string): string {
    if (language === 'it') {
      return `ESEMPIO DI STILE (riferimento per densità e concretezza):

Input: Trilocale 85 m², 3° piano con ascensore, balcone 8 m², riscaldamento autonomo, classe B, Via Bergognone 15 Milano (Porta Romana), metro Romolo 3 min a piedi, parco 5 min, €320k vendita, spese cond. €80/mese

Output description (esempio):
"Trilocale ristrutturato di 85 m² in Via Bergognone 15, zona Porta Romana, Milano. Terzo piano di palazzina anni '60 con ascensore, classe energetica B, riscaldamento autonomo a metano.

Gli spazi interni includono soggiorno 25 m² con angolo cottura, due camere da letto (14 m² e 12 m²), bagno completo con doccia e antibagno. Pavimenti in gres porcellanato, infissi in PVC doppio vetro sostituiti nel 2021, porte interne laccate bianche.

Balcone 8 m² affaccio su cortile interno silenzioso, ideale per pranzi all'aperto. Cantina 4 m² al piano interrato inclusa. Portineria part-time dal lunedì al venerdì.

Posizione strategica a 3 minuti a piedi dalla metro M2 Romolo, 5 minuti dal Parco Ravizza (10 ettari), supermercati Esselunga e Carrefour entro 300 metri. Fermata tram 3 davanti al portone. Zona servita da scuole primarie e asilo nido comunale.

Prezzo di vendita €320.000, spese condominiali €80 al mese. Disponibilità immediata, libero da vincoli. APE classe B, IPE 45 kWh/m²anno."

highlights: ["85 m² piano 3° con ascensore", "Balcone 8 m² cortile silenzioso", "Metro Romolo a 3 min piedi", "Riscaldamento autonomo classe B", "Ristrutturato infissi nuovi 2021", "Parco Ravizza 5 min a piedi", "€320k spese cond €80/mese"]`;
    } else if (language === 'ru') {
      return `ПРИМЕР СТИЛЯ (референс для плотности и конкретности):

Input: Трехкомнатная 85 м², 3 этаж с лифтом, балкон 8 м², автономное отопление, класс B, Via Bergognone 15 Милан (Порта Романа), метро Ромоло 3 мин пешком, парк 5 мин, €320k продажа, кондо €80/мес

Output description (пример):
"Трехкомнатная квартира 85 м² после ремонта на Via Bergognone 15, район Порта Романа, Милан. Третий этаж здания 1960-х с лифтом, энергокласс B, автономное газовое отопление.

Внутренние пространства включают гостиную 25 м² с кухонной зоной, две спальни (14 м² и 12 м²), полная ванная с душем и прихожая. Керамогранитные полы, окна ПВХ с двойным остеклением заменены в 2021 году, межкомнатные двери белые лакированные.

Балкон 8 м² с видом на тихий внутренний двор, идеален для обедов на свежем воздухе. Кладовая 4 м² в подвале включена. Консьерж по будням.

Стратегическое расположение в 3 минутах пешком от метро M2 Ромоло, 5 минут до парка Равицца (10 га), супермаркеты Esselunga и Carrefour в 300 метрах. Трамвайная остановка 3 у входа. Район с начальными школами и муниципальным детсадом.

Цена продажи €320,000, кондо-платежи €80 в месяц. Свободна сразу, без обременений. APE класс B, IPE 45 кВтч/м²год."

highlights: ["85 м² 3 этаж с лифтом", "Балкон 8 м² тихий двор", "Метро Ромоло 3 мин пешком", "Автономное отопление класс B", "Ремонт новые окна 2021", "Парк Равицца 5 мин пешком", "€320k кондо €80/мес"]`;
    } else {
      return `STYLE EXAMPLE (reference for density and concreteness):

Input: 3-room 85 m², 3rd floor with elevator, 8 m² balcony, independent heating, class B, Via Bergognone 15 Milan (Porta Romana), metro Romolo 3 min walk, park 5 min, €320k sale, condo €80/month

Output description (example):
"Renovated 3-room apartment 85 m² at Via Bergognone 15, Porta Romana area, Milan. Third floor of 1960s building with elevator, energy class B, independent gas heating.

Interior spaces include 25 m² living room with kitchenette, two bedrooms (14 m² and 12 m²), full bathroom with shower and hallway. Porcelain tile floors, PVC double-glazed windows replaced in 2021, white lacquered interior doors.

8 m² balcony overlooking quiet internal courtyard, ideal for outdoor dining. 4 m² cellar in basement included. Part-time concierge weekdays.

Strategic location 3 minutes walk from M2 Romolo metro, 5 minutes to Ravizza Park (10 hectares), Esselunga and Carrefour supermarkets within 300 meters. Tram 3 stop at entrance. Area served by primary schools and municipal nursery.

Sale price €320,000, condo fees €80 per month. Immediate availability, free of encumbrances. APE class B, IPE 45 kWh/m²year."

highlights: ["85 m² 3rd floor with elevator", "8 m² balcony quiet courtyard", "Metro Romolo 3 min walk", "Independent heating class B", "Renovated new windows 2021", "Ravizza Park 5 min walk", "€320k condo €80/month"]`;
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
