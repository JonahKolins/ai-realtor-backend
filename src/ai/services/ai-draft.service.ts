import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOpenaiService } from './ai-openai.service';
import { AiPromptService, ContentPlan, MustCover } from './ai-prompt.service';
import { GenerateDraftDto, ListingDraftDto, Tone, Length } from '../../listings/dto/generate-draft.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

interface QualityMetrics {
  coverageScore: number;
  structureValid: boolean;
  paragraphCount: number;
  highlightsCount: number;
  missingMustCover: string[];
}

@Injectable()
export class AiDraftService {
  private readonly logger = new Logger(AiDraftService.name);
  private readonly refineEnabled: boolean;
  private readonly qualityThreshold: number;

  constructor(
    private readonly aiOpenaiService: AiOpenaiService,
    private readonly aiPromptService: AiPromptService,
    private readonly configService: ConfigService,
  ) {
    this.refineEnabled = this.configService.get<boolean>('ai.refineEnabled', false);
    this.qualityThreshold = this.configService.get<number>('ai.qualityThreshold', 0.7);
  }

  async generateDraft(listing: any, request: GenerateDraftDto): Promise<ListingDraftDto> {
    const requestId = this.generateRequestId();
    const locale = request.locale || 'it-IT';
    const tone = request.tone || Tone.PROFESSIONALE;
    const length = request.length || Length.MEDIUM;
    const language = locale.split('-')[0].toLowerCase();
    
    try {
      this.logger.log(`Generating AI draft`, {
        requestId,
        listing,
        locale,
        tone,
        length,
        refineEnabled: this.refineEnabled,
      });

      // Генерация contentPlan и mustCover
      const contentPlan = this.aiPromptService.generateContentPlan(length);
      const mustCover = this.aiPromptService.generateMustCover(listing, language);

      // Первый проход: генерация черновика
      const messages = this.aiPromptService.build({
        listing,
        locale,
        tone,
        length,
      });

      const draftResponse = await this.aiOpenaiService.createChatCompletion({
        messages,
        responseFormat: 'json_object',
        temperature: 0.6,
        frequencyPenalty: 0.2,
        topP: 0.8,
      });

      // Парсинг и валидация черновика
      let draft = await this.parseAndValidateDraft(draftResponse.content, requestId);
      if (!draft) {
        return this.createFallbackDraft(listing, request);
      }

      // Оценка качества черновика
      let qualityMetrics = this.assessQuality(draft, mustCover, contentPlan);
      this.logger.log(`Draft quality metrics`, {
        requestId,
        ...qualityMetrics,
      });

      // Второй проход (refine) если включён и качество ниже порога
      if (this.refineEnabled && qualityMetrics.coverageScore < this.qualityThreshold) {
        this.logger.log(`Running refine pass`, {
          requestId,
          reason: `Coverage score ${qualityMetrics.coverageScore} below threshold ${this.qualityThreshold}`,
        });

        const refinedDraft = await this.refineDraft(
          listing,
          draft,
          contentPlan,
          mustCover,
          language,
          requestId
        );

        if (refinedDraft) {
          const refinedMetrics = this.assessQuality(refinedDraft, mustCover, contentPlan);
          this.logger.log(`Refined draft quality metrics`, {
            requestId,
            ...refinedMetrics,
          });

          // Используем улучшенный драфт только если он лучше
          if (refinedMetrics.coverageScore >= qualityMetrics.coverageScore) {
            draft = refinedDraft;
            qualityMetrics = refinedMetrics;
          } else {
            this.logger.warn(`Refined draft quality worse than original, using original`, {
              requestId,
            });
          }
        }
      }

      // Финальная проверка качества
      if (qualityMetrics.coverageScore < this.qualityThreshold) {
        this.logger.warn(`Final draft quality below threshold`, {
          requestId,
          coverageScore: qualityMetrics.coverageScore,
          threshold: this.qualityThreshold,
          missingMustCover: qualityMetrics.missingMustCover,
        });
      }

      // Санитизация и финализация
      const sanitizedDraft = this.sanitizeContent(draft, length);

      this.logger.log(`AI draft generated successfully`, {
        requestId,
        listingId: listing.id,
        finalCoverageScore: qualityMetrics.coverageScore,
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

      return this.createFallbackDraft(listing, request);
    }
  }

  private async refineDraft(
    listing: any,
    draft: ListingDraftDto,
    contentPlan: ContentPlan,
    mustCover: MustCover,
    language: string,
    requestId: string
  ): Promise<ListingDraftDto | null> {
    try {
      const refineMessages = this.aiPromptService.buildRefinePrompt(
        listing,
        draft,
        contentPlan,
        mustCover,
        language
      );

      const refineResponse = await this.aiOpenaiService.createChatCompletion({
        messages: refineMessages,
        responseFormat: 'json_object',
        temperature: 0.5,
        frequencyPenalty: 0.3,
        topP: 0.8,
      });

      const refinedDraft = await this.parseAndValidateDraft(refineResponse.content, requestId);
      return refinedDraft;
    } catch (error) {
      this.logger.error(`Refine pass failed`, {
        requestId,
        error: error.message,
      });
      return null;
    }
  }

  private async parseAndValidateDraft(content: string, requestId: string): Promise<ListingDraftDto | null> {
    try {
      const parsed = JSON.parse(content);
      const draft = plainToClass(ListingDraftDto, parsed);
      const validationErrors = await validate(draft);

      if (validationErrors.length > 0) {
        this.logger.warn(`Draft validation failed`, {
          requestId,
          errors: validationErrors.map(e => ({
            property: e.property,
            constraints: e.constraints,
          })),
        });
        return null;
      }

      return draft;
    } catch (error) {
      this.logger.warn(`Failed to parse draft JSON`, {
        requestId,
        error: error.message,
      });
      return null;
    }
  }

  private assessQuality(draft: ListingDraftDto, mustCover: MustCover, contentPlan: ContentPlan): QualityMetrics {
    // Проверка структуры
    const paragraphs = draft.description.split(/\n\n+/).filter(p => p.trim());
    const paragraphCount = paragraphs.length;
    const structureValid = paragraphCount === 5;

    // Проверка highlights
    const highlightsCount = draft.highlights.length;
    const highlightsValid = highlightsCount >= 5 && highlightsCount <= 7;

    // Проверка покрытия mustCover
    const descriptionLower = draft.description.toLowerCase();
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    // Проверяем обязательные элементы
    mustCover.required.forEach(item => {
      const searchTerms = this.extractSearchTerms(item);
      const found = searchTerms.some(term => descriptionLower.includes(term.toLowerCase()));
      if (!found) {
        missingRequired.push(item);
      }
    });

    // Проверяем опциональные элементы
    mustCover.optional.forEach(item => {
      const searchTerms = this.extractSearchTerms(item);
      const found = searchTerms.some(term => descriptionLower.includes(term.toLowerCase()));
      if (!found) {
        missingOptional.push(item);
      }
    });

    // Расчёт coverage score
    const totalMustCover = mustCover.required.length + mustCover.optional.length;
    const coveredCount = totalMustCover - missingRequired.length - missingOptional.length;
    const coverageScore = totalMustCover > 0 ? coveredCount / totalMustCover : 1.0;

    // Проверка длины параграфов (приблизительно)
    const paragraphWordCounts = paragraphs.map(p => p.split(/\s+/).length);
    const targets = [
      contentPlan.intro.targetWords,
      contentPlan.interni.targetWords,
      contentPlan.esterni.targetWords,
      contentPlan.zona.targetWords,
      contentPlan.termini.targetWords,
    ];

    return {
      coverageScore,
      structureValid,
      paragraphCount,
      highlightsCount,
      missingMustCover: [...missingRequired, ...missingOptional],
    };
  }

  private extractSearchTerms(item: string): string[] {
    // Извлекаем ключевые термины из mustCover item для поиска
    // Например: "superficie 85 m²" -> ["superficie", "85", "m²", "85 m²"]
    const terms: string[] = [item];
    
    // Извлекаем числа с единицами измерения
    const numberWithUnit = item.match(/(\d+)\s*(m²|м²|min|мин|€)/g);
    if (numberWithUnit) {
      terms.push(...numberWithUnit);
    }

    // Извлекаем отдельные слова (исключая предлоги и союзы)
    const words = item.split(/[\s,:/]+/).filter(w => 
      w.length > 2 && 
      !['con', 'di', 'per', 'a', 'in', 'da', 'su', 'и', 'в', 'с', 'на', 'для', 'the', 'and', 'or', 'with'].includes(w.toLowerCase())
    );
    terms.push(...words);

    return terms;
  }

  private sanitizeContent(draft: ListingDraftDto, length: Length): ListingDraftDto {
    // Расширенный список запрещенных терминов
    const prohibitedTerms = [
      // Дискриминация (IT)
      'solo italiani', 'no stranieri', 'solo uomini', 'solo donne', 'preferibilmente',
      // Дискриминация (RU)
      'только местные', 'только для', 'без иностранцев',
      // Гарантии (IT)
      'garanzia', 'garantito', 'sicuro al 100%', 'senza rischi', 'investimento sicuro',
      // Гарантии (RU)
      'гарантия', 'гарантировано', '100% безопасно', 'без рисков',
      // Гарантии (EN)
      'guaranteed', '100% safe', 'risk-free',
      // Недоказуемые суперлативы
      'il migliore', 'il più bello', 'unico nel suo genere',
      'лучший в районе', 'самый красивый', 'единственный',
      'the best', 'the most beautiful', 'unique',
      // Медицинские утверждения
      'guarire', 'curare', 'terapeutico', 'лечебный', 'целебный',
    ];

    // Очистка текстов
    const sanitize = (text: string): string => {
      let cleaned = text;
      prohibitedTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        cleaned = cleaned.replace(regex, '');
      });
      // Удаляем лишние пробелы
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    };

    // Лимиты длины
    const maxTitleLength = 100;
    const summaryWordLimits = {
      [Length.SHORT]: { min: 80, max: 120 },
      [Length.MEDIUM]: { min: 100, max: 200 },
      [Length.LONG]: { min: 150, max: 250 },
    };

    // Санитизация и нормализация
    let title = sanitize(draft.title);
    if (title.length > maxTitleLength) {
      title = title.substring(0, maxTitleLength - 3) + '...';
    }

    let summary = sanitize(draft.summary);
    const summaryWords = summary.split(/\s+/);
    const summaryLimits = summaryWordLimits[length] || summaryWordLimits[Length.MEDIUM];
    if (summaryWords.length < summaryLimits.min) {
      // Слишком короткий summary - оставляем как есть, но логируем
      this.logger.warn(`Summary too short: ${summaryWords.length} words, expected ${summaryLimits.min}-${summaryLimits.max}`);
    } else if (summaryWords.length > summaryLimits.max) {
      // Обрезаем summary
      summary = summaryWords.slice(0, summaryLimits.max).join(' ') + '...';
    }

    const description = sanitize(draft.description);

    // Фильтрация highlights
    const highlights = draft.highlights
      .map(h => sanitize(h))
      .filter(h => {
        const words = h.split(/\s+/);
        return h.length > 0 && words.length >= 3 && words.length <= 10;
      })
      .slice(0, 7); // Максимум 7

    // Фильтрация SEO keywords
    const keywords = draft.seo.keywords
      .filter(k => k && k.trim())
      .map(k => sanitize(k))
      .filter(k => k.length > 0)
      .slice(0, 8); // Максимум 8

    let metaDescription = sanitize(draft.seo.metaDescription);
    if (metaDescription.length < 120) {
      this.logger.warn(`Meta description too short: ${metaDescription.length} chars, expected 120-160`);
    } else if (metaDescription.length > 160) {
      metaDescription = metaDescription.substring(0, 157) + '...';
    }

    return {
      title,
      summary,
      description,
      highlights,
      disclaimer: draft.disclaimer, // Дисклеймер не санитизируем
      seo: {
        keywords,
        metaDescription,
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
