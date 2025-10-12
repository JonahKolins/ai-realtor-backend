import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { 
  ListListingsDto, 
  ListingResponseDto, 
  ListListingsResponseDto 
} from './dto/list-listings.dto';
import { GenerateDraftDto, ListingDraftDto, SaveDraftDto } from './dto/generate-draft.dto';
import { AiDraftService } from '../ai/services/ai-draft.service';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly aiDraftService: AiDraftService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый черновик листинга' })
  @ApiResponse({
    status: 201,
    description: 'Листинг успешно создан',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации',
    example: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'title must be shorter than or equal to 200 characters'
      }
    }
  })
  async create(@Body() createListingDto: CreateListingDto): Promise<ListingResponseDto> {
    return this.listingsService.create(createListingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список листингов с фильтрацией и пагинацией' })
  @ApiQuery({ name: 'status', required: false, description: 'Фильтр по статусу' })
  @ApiQuery({ name: 'type', required: false, description: 'Фильтр по типу' })
  @ApiQuery({ name: 'propertyType', required: false, description: 'Фильтр по типу недвижимости' })
  @ApiQuery({ name: 'q', required: false, description: 'Поиск по заголовку' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество элементов на странице' })
  @ApiQuery({ name: 'sort', required: false, description: 'Сортировка' })
  @ApiResponse({
    status: 200,
    description: 'Список листингов',
    type: ListListingsResponseDto,
  })
  async findAll(@Query() query: ListListingsDto): Promise<ListListingsResponseDto> {
    return this.listingsService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить листинг по ID' })
  @ApiParam({ name: 'id', description: 'ID листинга' })
  @ApiResponse({
    status: 200,
    description: 'Детали листинга',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Листинг не найден',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found'
      }
    }
  })
  async findOne(@Param('id') id: string): Promise<ListingResponseDto> {
    return this.listingsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Частично обновить листинг' })
  @ApiParam({ name: 'id', description: 'ID листинга' })
  @ApiResponse({
    status: 200,
    description: 'Листинг успешно обновлён',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Листинг не найден',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации',
    example: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'price must be greater than or equal to 0'
      }
    }
  })
  async update(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    return this.listingsService.update(id, updateListingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Мягко удалить листинг' })
  @ApiParam({ name: 'id', description: 'ID листинга' })
  @ApiResponse({
    status: 204,
    description: 'Листинг успешно удалён',
  })
  @ApiResponse({
    status: 404,
    description: 'Листинг не найден',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found'
      }
    }
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.listingsService.softDelete(id);
  }

  @Post(':id/generate-draft')
  @ApiOperation({ summary: 'Генерировать AI-описание для листинга' })
  @ApiParam({ name: 'id', description: 'ID листинга' })
  @ApiResponse({
    status: 200,
    description: 'AI-описание успешно сгенерировано',
    type: ListingDraftDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные параметры или невалидный ответ модели',
    example: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Нет прав доступа',
    example: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access denied'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Объявление не найдено',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found'
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит запросов',
    example: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded'
      }
    }
  })
  @ApiResponse({
    status: 502,
    description: 'Ошибка провайдера LLM',
    example: {
      error: {
        code: 'LLM_PROVIDER_ERROR',
        message: 'LLM provider error'
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Внутренняя ошибка сервера',
    example: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }
  })
  async generateDraft(
    @Param('id') id: string,
    @Body() generateDraftDto: GenerateDraftDto,
  ): Promise<ListingDraftDto> {
    // Получение полных данных листинга для AI
    const listing = await this.listingsService.getByIdForOwner(id);
    
    // Генерация AI-описания
    return this.aiDraftService.generateDraft(listing, generateDraftDto);
  }

  @Post('save-draft')
  @ApiOperation({ summary: 'Сохранить черновик объявления' })
  @ApiResponse({
    status: 201,
    description: 'Черновик успешно сохранён',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Черновик успешно обновлён',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации',
    example: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Объявление не найдено (при обновлении существующего)',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found'
      }
    }
  })
  async saveDraft(@Body() saveDraftDto: SaveDraftDto): Promise<ListingResponseDto> {
    return this.listingsService.saveDraft(saveDraftDto);
  }
}
