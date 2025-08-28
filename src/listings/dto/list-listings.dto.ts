import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, ListingStatus, ListingSortOrder } from '../types/listing.types';

export class ListListingsDto {
  @ApiProperty({
    description: 'Фильтр по статусу',
    enum: ListingStatus,
    required: false,
    example: ListingStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Status must be "draft", "ready", or "archived"' })
  status?: ListingStatus;

  @ApiProperty({
    description: 'Фильтр по типу',
    enum: ListingType,
    required: false,
    example: ListingType.SALE,
  })
  @IsOptional()
  @IsEnum(ListingType, { message: 'Type must be either "sale" or "rent"' })
  type?: ListingType;

  @ApiProperty({
    description: 'Поисковая строка (поиск по заголовку)',
    maxLength: 200,
    required: false,
    example: 'Bilocale',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Search query must be shorter than or equal to 200 characters' })
  q?: string;

  @ApiProperty({
    description: 'Номер страницы',
    minimum: 1,
    default: 1,
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  @Transform(({ value }) => parseInt(value) || 1)
  page: number = 1;

  @ApiProperty({
    description: 'Количество элементов на странице',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be greater than or equal to 1' })
  @Max(100, { message: 'Limit must be less than or equal to 100' })
  @Transform(({ value }) => parseInt(value) || 20)
  limit: number = 20;

  @ApiProperty({
    description: 'Сортировка',
    enum: ListingSortOrder,
    default: ListingSortOrder.CREATED_AT_DESC,
    required: false,
    example: ListingSortOrder.CREATED_AT_DESC,
  })
  @IsOptional()
  @IsEnum(ListingSortOrder, { 
    message: 'Sort must be one of: createdAt, -createdAt, price, -price' 
  })
  sort: ListingSortOrder = ListingSortOrder.CREATED_AT_DESC;
}

export class ListingResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Тип листинга', enum: ListingType })
  type: ListingType;

  @ApiProperty({ description: 'Статус листинга', enum: ListingStatus })
  status: ListingStatus;

  @ApiProperty({ description: 'Заголовок', example: '2-комнатная в центре', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Цена', example: 250000, nullable: true })
  price: number | null;

  @ApiProperty({ description: 'Пользовательские поля', example: { city: 'Milano' }, nullable: true })
  userFields: Record<string, any> | null;

  @ApiProperty({ description: 'Дата создания', example: '2025-08-28T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Дата обновления', example: '2025-08-28T10:00:00.000Z' })
  updatedAt: string;
}

export class ListListingsResponseDto {
  @ApiProperty({ description: 'Список листингов', type: [ListingResponseDto] })
  items: ListingResponseDto[];

  @ApiProperty({ description: 'Текущая страница', example: 1 })
  page: number;

  @ApiProperty({ description: 'Количество элементов на странице', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Общее количество элементов', example: 3 })
  total: number;
}
