import { Injectable, Logger, BadRequestException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ChatCompletionRequest {
  messages: ChatCompletionMessageParam[];
  responseFormat?: 'json_object' | 'text';
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  requestId: string;
}

@Injectable()
export class AiOpenaiService {
  private readonly logger = new Logger(AiOpenaiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    const baseURL = this.configService.get<string>('ai.openai.baseURL');
    this.model = this.configService.get<string>('ai.openai.model');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // В тестовом режиме используем fallback
    if (apiKey.startsWith('sk-test-')) {
      this.logger.warn('Using test mode - AI requests will use fallback responses');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Проверяем тестовый режим
    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    if (apiKey?.startsWith('sk-test-')) {
      return this.createMockResponse(requestId, startTime, request);
    }

    try {
      this.logger.log(`AI request started`, {
        requestId,
        model: this.model,
        messageCount: request.messages.length,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: request.messages,
        response_format: request.responseFormat === 'json_object' 
          ? { type: 'json_object' } 
          : { type: 'text' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseTime = Date.now() - startTime;

      const response: ChatCompletionResponse = {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
        model: completion.model,
        requestId,
      };

      this.logger.log(`AI request completed`, {
        requestId,
        model: this.model,
        responseTime,
        usage: response.usage,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof OpenAI.APIError) {
        this.logger.error(`OpenAI API error`, {
          requestId,
          model: this.model,
          responseTime,
          status: error.status,
          code: error.code,
          message: error.message,
        });

        if (error.status === 429) {
          throw new BadRequestException('Rate limit exceeded');
        }

        throw new BadGatewayException('LLM provider error');
      }

      this.logger.error(`Unexpected AI error`, {
        requestId,
        model: this.model,
        responseTime,
        error: error.message,
      });

      throw new BadGatewayException('AI service unavailable');
    }
  }

  private createMockResponse(requestId: string, startTime: number, request: ChatCompletionRequest): ChatCompletionResponse {
    const responseTime = Date.now() - startTime;
    
    const mockResponse = JSON.stringify({
      title: "Luminoso trilocale con balcone nel cuore di Milano",
      summary: "Splendido appartamento di 85mq situato al terzo piano in Via Roma 15, zona Porta Romana. Completamente ristrutturato, offre ambienti luminosi e ben distribuiti con balcone panoramico.",
      description: "Questo elegante trilocale rappresenta un'eccellente opportunità abitativa nel prestigioso quartiere di Porta Romana. L'immobile, completamente ristrutturato, si sviluppa su una superficie di 85mq al terzo piano di un edificio signorile. Gli spazi sono stati ottimizzati per garantire massima funzionalità e comfort: la zona giorno è caratterizzata da ambienti luminosi grazie alla doppia esposizione, mentre la zona notte offre privacy e tranquillità. Il balcone rappresenta un valore aggiunto, perfetto per momenti di relax all'aria aperta. La posizione strategica permette di raggiungere facilmente il centro storico e i principali servizi della città.",
      highlights: [
        "Appartamento completamente ristrutturato",
        "Balcone con esposizione luminosa",
        "Posizione strategica a Porta Romana",
        "85mq ben distribuiti",
        "Terzo piano in edificio signorile"
      ],
      disclaimer: "Le informazioni sono indicative e non costituiscono vincolo contrattuale. È necessario verificare tutti i dettagli prima della conclusione.",
      seo: {
        keywords: ["trilocale Milano", "appartamento Porta Romana", "vendita immobile", "balcone", "ristrutturato"],
        metaDescription: "Luminoso trilocale ristrutturato con balcone a Porta Romana, Milano. 85mq, terzo piano, posizione strategica. Scopri di più."
      }
    });

    this.logger.log(`AI mock response generated`, {
      requestId,
      model: 'mock-model',
      responseTime,
      usage: { promptTokens: 150, completionTokens: 200, totalTokens: 350 },
    });

    return {
      content: mockResponse,
      usage: {
        promptTokens: 150,
        completionTokens: 200,
        totalTokens: 350,
      },
      model: 'mock-gpt-4o-mini',
      requestId,
    };
  }

  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
