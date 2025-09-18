import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Tone, Length } from '../../listings/dto/generate-draft.dto';

export interface PromptBuildRequest {
  listing: any; // полные данные листинга из БД
  locale: string;
  tone: Tone;
  length: Length;
}

@Injectable()
export class AiPromptService {
  
  build(request: PromptBuildRequest): ChatCompletionMessageParam[] {
    const { listing, locale, tone, length } = request;
    
    return [
      {
        role: 'system',
        content: this.buildSystemPrompt(locale, tone, length),
      },
      {
        role: 'developer',
        content: this.buildDeveloperPrompt(),
      },
      {
        role: 'user',
        content: this.buildUserPrompt(listing),
      },
    ];
  }

  private buildSystemPrompt(locale: string, tone: Tone, length: Length): string {
    const language = this.getLanguageFromLocale(locale);
    const toneInstructions = this.getToneInstructions(tone, language);
    const lengthInstructions = this.getLengthInstructions(length, language);

    if (language === 'it') {
      return `Sei un assistente AI specializzato nella creazione di annunci immobiliari professionali in italiano.

REGOLE GENERALI:
- Scrivi sempre in italiano fluente e naturale
- ${toneInstructions}
- ${lengthInstructions}
- Non inventare informazioni non fornite
- Usa un linguaggio inclusivo e rispettoso
- Evita promesse irrealistiche o affermazioni discriminatorie
- Concentrati sui vantaggi reali della proprietà

STRUTTURA RICHIESTA:
- title: Titolo accattivante (max 80 caratteri)
- summary: Riassunto breve e coinvolgente (100-150 parole)
- description: Descrizione dettagliata e persuasiva
- highlights: Array di 3-5 caratteristiche principali
- disclaimer: Disclaimer legale standard
- seo: keywords array e metaDescription

Rispondi sempre in formato JSON valido.`;
    } else if (language === 'ru') {
      return `Вы - AI-ассистент, специализирующийся на создании профессиональных объявлений о недвижимости на русском языке.

ОБЩИЕ ПРАВИЛА:
- Всегда пишите на естественном русском языке
- ${toneInstructions}
- ${lengthInstructions}
- Не придумывайте информацию, которая не предоставлена
- Используйте инклюзивный и уважительный язык
- Избегайте нереалистичных обещаний или дискриминационных заявлений
- Сосредоточьтесь на реальных преимуществах недвижимости

ТРЕБУЕМАЯ СТРУКТУРА:
- title: Привлекательный заголовок (макс 80 символов)
- summary: Краткое и увлекательное резюме (100-150 слов)
- description: Подробное и убедительное описание
- highlights: Массив из 3-5 основных характеристик
- disclaimer: Стандартный правовой дисклеймер
- seo: массив keywords и metaDescription

Всегда отвечайте в формате валидного JSON.`;
    } else { // English fallback
      return `You are an AI assistant specialized in creating professional real estate listings in English.

GENERAL RULES:
- Always write in fluent and natural English
- ${toneInstructions}
- ${lengthInstructions}
- Do not invent information not provided
- Use inclusive and respectful language
- Avoid unrealistic promises or discriminatory statements
- Focus on real property advantages

REQUIRED STRUCTURE:
- title: Catchy title (max 80 characters)
- summary: Brief and engaging summary (100-150 words)
- description: Detailed and persuasive description
- highlights: Array of 3-5 main features
- disclaimer: Standard legal disclaimer
- seo: keywords array and metaDescription

Always respond in valid JSON format.`;
    }
  }

  private buildDeveloperPrompt(): string {
    return `Genera un JSON con questa struttura esatta:
{
  "title": "string",
  "summary": "string", 
  "description": "string",
  "highlights": ["string", "string", "string"],
  "disclaimer": "string",
  "seo": {
    "keywords": ["string", "string", "string"],
    "metaDescription": "string"
  }
}

IMPORTANTE: 
- Rispetta rigorosamente questa struttura JSON
- Non aggiungere campi extra
- Assicurati che il JSON sia valido e parsabile
- I highlights devono essere 3-5 elementi
- Le keywords SEO devono essere 5-8 elementi rilevanti`;
  }

  private buildUserPrompt(listing: any): string {
    const listingData = {
      id: listing.id,
      type: listing.type, // SALE or RENT
      propertyType: listing.propertyType,
      title: listing.title,
      price: listing.price,
      userFields: listing.userFields || {},
    };

    return `Crea un annuncio immobiliare per questa proprietà:

DATI PROPRIETÀ:
${JSON.stringify(listingData, null, 2)}

Usa queste informazioni per creare un annuncio attraente e professionale. Se alcuni dati sono limitati, concentrati su quelli disponibili senza inventare dettagli.`;
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
