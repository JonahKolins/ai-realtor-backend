import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  MaxLength,
  Min,
  IsIn,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, ListingStatus, PROPERTY_TYPES } from '../types/listing.types';

export class UpdateListingDto {
  @ApiProperty({
    description: 'Тип листинга',
    enum: ListingType,
    example: ListingType.SALE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ListingType, { message: 'Type must be either "sale" or "rent"' })
  type?: ListingType;

  @ApiProperty({
    description: 'Тип недвижимости',
    enum: PROPERTY_TYPES,
    example: 'house',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(PROPERTY_TYPES, { 
    message: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}` 
  })
  propertyType?: string;

  @ApiProperty({
    description: 'Статус листинга',
    enum: ListingStatus,
    example: ListingStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(ListingStatus, { message: 'Status must be "draft", "ready", or "archived"' })
  status?: ListingStatus;

  @ApiProperty({
    description: 'Заголовок объявления',
    maxLength: 200,
    example: 'Обновлённый заголовок',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must be shorter than or equal to 200 characters' })
  title?: string;

  @ApiProperty({
    description: 'Цена объекта',
    minimum: 0,
    example: 260000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  price?: number;

  @ApiProperty({
    description: 'Краткое описание объявления',
    maxLength: 500,
    example: 'Обновлённое краткое описание',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Summary must be shorter than or equal to 500 characters' })
  summary?: string;

  @ApiProperty({
    description: 'Полное описание объявления',
    maxLength: 2000,
    example: 'Обновлённое полное описание',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must be shorter than or equal to 2000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Ключевые особенности объекта',
    type: [String],
    example: ['Обновлённая особенность 1', 'Обновлённая особенность 2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @ApiProperty({
    description: 'SEO ключевые слова',
    type: [String],
    example: ['обновлённое', 'ключевое', 'слово'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'SEO мета-описание',
    maxLength: 160,
    example: 'Обновлённое мета-описание',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description must be shorter than or equal to 160 characters' })
  metaDescription?: string;

  @ApiProperty({
    description: 'Медиа файлы - фотографии',
    type: [String],
    example: ['new_photo1.jpg', 'new_photo2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({
    description: 'Медиа файлы - документы',
    type: [String],
    example: ['new_document1.pdf', 'new_document2.pdf'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({
    description: 'Произвольные поля пользователя (мерджятся с существующими)',
    type: 'object',
    example: {
      balcony: false,
      notes: 'тихий двор',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'User fields must be an object' })
  userFields?: Record<string, any>;
}
