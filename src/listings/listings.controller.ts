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

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

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
}
