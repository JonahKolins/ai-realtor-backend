import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiOpenaiService } from './ai-openai.service';
import { AiPromptService } from './ai-prompt.service';
import { GenerateDraftDto, ListingDraftDto, Tone, Length } from '../../listings/dto/generate-draft.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class AiDraftService {
  private readonly logger = new Logger(AiDraftService.name);

  constructor(
    private readonly aiOpenaiService: AiOpenaiService,
    private readonly aiPromptService: AiPromptService,
  ) {}

  async generateDraft(listing: any, request: GenerateDraftDto): Promise<ListingDraftDto> {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.log(`Generating AI draft`, {
        requestId,
        listingId: listing.id,
        locale: request.locale,
        tone: request.tone,
        length: request.length,
      });

      // Построение промпта
      const messages = this.aiPromptService.build({
        listing,
        locale: request.locale || 'it-IT',
        tone: request.tone || Tone.PROFESSIONALE,
        length: request.length || Length.MEDIUM,
      });

      // Запрос к OpenAI
      const aiResponse = await this.aiOpenaiService.createChatCompletion({
        messages,
        responseFormat: 'json_object',
      });

      // Парсинг и валидация ответа
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(aiResponse.content);
      } catch (error) {
        this.logger.warn(`Failed to parse AI response as JSON`, {
          requestId,
          content: aiResponse.content,
        });
        return this.createFallbackDraft(listing, request);
      }

      // Валидация структуры
      const draft = plainToClass(ListingDraftDto, parsedResponse);
      const validationErrors = await validate(draft);

      if (validationErrors.length > 0) {
        this.logger.warn(`AI response validation failed`, {
          requestId,
          errors: validationErrors,
        });
        return this.createFallbackDraft(listing, request);
      }

      // Санитизация контента
      const sanitizedDraft = this.sanitizeContent(draft);

      this.logger.log(`AI draft generated successfully`, {
        requestId,
        listingId: listing.id,
        usage: aiResponse.usage,
      });

      return sanitizedDraft;

    } catch (error) {
      this.logger.error(`Failed to generate AI draft`, {
        requestId,
        listingId: listing.id,
        error: error.message,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      // В случае любой ошибки возвращаем фоллбэк
      return this.createFallbackDraft(listing, request);
    }
  }

  private sanitizeContent(draft: ListingDraftDto): ListingDraftDto {
    // Список запрещенных слов/фраз
    const prohibitedTerms = [
      // Дискриминационные термины
      'только для', 'no stranieri', 'solo italiani', 'preferibilmente', 
      // Нереалистичные обещания
      'garanzia', 'garantito', 'sicuro al 100%', 'senza rischi',
      // Медицинские утверждения
      'guarire', 'curare', 'terapeutico',
    ];

    // Очистка текстов
    const sanitize = (text: string): string => {
      let cleaned = text;
      prohibitedTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        cleaned = cleaned.replace(regex, '[removed]');
      });
      return cleaned.trim();
    };

    return {
      title: sanitize(draft.title),
      summary: sanitize(draft.summary),
      description: sanitize(draft.description),
      highlights: draft.highlights.map(h => sanitize(h)).filter(h => h && h !== '[removed]'),
      disclaimer: draft.disclaimer, // Дисклеймер не санитизируем
      seo: {
        keywords: draft.seo.keywords.filter(k => k && k.trim()),
        metaDescription: sanitize(draft.seo.metaDescription),
      },
    };
  }

  private createFallbackDraft(listing: any, request: GenerateDraftDto): ListingDraftDto {
    const locale = request.locale || 'it-IT';
    const language = locale.split('-')[0].toLowerCase();

    if (language === 'it') {
      return {
        title: listing.title || `${listing.propertyType} in ${listing.type === 'SALE' ? 'vendita' : 'affitto'}`,
        summary: `Interessante ${listing.propertyType} ${listing.type === 'SALE' ? 'in vendita' : 'in affitto'}${listing.price ? ` a €${listing.price}` : ''}.`,
        description: `Questa proprietà rappresenta un'ottima opportunità ${listing.type === 'SALE' ? 'di investimento' : 'di locazione'}. Situata in una posizione strategica, offre caratteristiche interessanti per chi cerca una soluzione abitativa di qualità.`,
        highlights: [
          'Posizione strategica',
          'Caratteristiche interessanti',
          'Buona opportunità'
        ],
        disclaimer: 'Le informazioni sono indicative e non costituiscono vincolo contrattuale. È necessario verificare tutti i dettagli prima della conclusione.',
        seo: {
          keywords: [listing.propertyType, listing.type === 'SALE' ? 'vendita' : 'affitto', 'immobile'],
          metaDescription: `${listing.propertyType} ${listing.type === 'SALE' ? 'in vendita' : 'in affitto'}${listing.price ? ` a €${listing.price}` : ''}. Scopri di più.`,
        },
      };
    } else if (language === 'ru') {
      return {
        title: listing.title || `${listing.propertyType} ${listing.type === 'SALE' ? 'на продажу' : 'в аренду'}`,
        summary: `Интересная недвижимость ${listing.type === 'SALE' ? 'на продажу' : 'в аренду'}${listing.price ? ` за €${listing.price}` : ''}.`,
        description: `Эта недвижимость представляет отличную возможность ${listing.type === 'SALE' ? 'для инвестиций' : 'для аренды'}. Расположенная в стратегически важном месте, она предлагает интересные характеристики для тех, кто ищет качественное жилищное решение.`,
        highlights: [
          'Стратегическое расположение',
          'Интересные характеристики',
          'Хорошая возможность'
        ],
        disclaimer: 'Информация носит ориентировочный характер и не является договорным обязательством. Необходимо проверить все детали перед заключением.',
        seo: {
          keywords: [listing.propertyType, listing.type === 'SALE' ? 'продажа' : 'аренда', 'недвижимость'],
          metaDescription: `${listing.propertyType} ${listing.type === 'SALE' ? 'на продажу' : 'в аренду'}${listing.price ? ` за €${listing.price}` : ''}. Узнать больше.`,
        },
      };
    } else { // English
      return {
        title: listing.title || `${listing.propertyType} for ${listing.type === 'SALE' ? 'sale' : 'rent'}`,
        summary: `Interesting ${listing.propertyType} for ${listing.type === 'SALE' ? 'sale' : 'rent'}${listing.price ? ` at €${listing.price}` : ''}.`,
        description: `This property represents an excellent ${listing.type === 'SALE' ? 'investment' : 'rental'} opportunity. Located in a strategic position, it offers interesting features for those seeking a quality housing solution.`,
        highlights: [
          'Strategic location',
          'Interesting features',
          'Good opportunity'
        ],
        disclaimer: 'The information is indicative and does not constitute a contractual obligation. All details must be verified before conclusion.',
        seo: {
          keywords: [listing.propertyType, listing.type === 'SALE' ? 'sale' : 'rent', 'property'],
          metaDescription: `${listing.propertyType} for ${listing.type === 'SALE' ? 'sale' : 'rent'}${listing.price ? ` at €${listing.price}` : ''}. Learn more.`,
        },
      };
    }
  }

  private generateRequestId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
