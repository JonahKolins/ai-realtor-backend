import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  MaxLength,
  Min,
  IsNotEmpty,
  IsIn,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType, PROPERTY_TYPES } from '../types/listing.types';

export class CreateListingDto {
  @ApiProperty({
    description: 'Тип листинга',
    enum: ListingType,
    example: ListingType.SALE,
  })
  @IsEnum(ListingType, { message: 'Type must be either "sale" or "rent"' })
  @IsNotEmpty()
  type: ListingType;

  @ApiProperty({
    description: 'Тип недвижимости',
    enum: PROPERTY_TYPES,
    example: 'apartment',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(PROPERTY_TYPES, { 
    message: `Property type must be one of: ${PROPERTY_TYPES.join(', ')}` 
  })
  propertyType?: string;

  @ApiProperty({
    description: 'Заголовок объявления',
    maxLength: 200,
    example: '2-комнатная в центре',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must be shorter than or equal to 200 characters' })
  title?: string;

  @ApiProperty({
    description: 'Цена объекта',
    minimum: 0,
    example: 250000,
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
    example: 'Trilocale ristrutturato vicino alla metro...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Summary must be shorter than or equal to 500 characters' })
  summary?: string;

  @ApiProperty({
    description: 'Полное описание объявления',
    maxLength: 2000,
    example: 'A due passi da Porta Romana...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must be shorter than or equal to 2000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Ключевые особенности объекта',
    type: [String],
    example: ['Cucina abitabile', 'Doppia esposizione', 'Riscaldamento autonomo'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @ApiProperty({
    description: 'SEO ключевые слова',
    type: [String],
    example: ['appartamento', 'affitto Milano', 'trilocale'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({
    description: 'SEO мета-описание',
    maxLength: 160,
    example: 'Trilocale ristrutturato in centro...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description must be shorter than or equal to 160 characters' })
  metaDescription?: string;

  @ApiProperty({
    description: 'Медиа файлы - фотографии',
    type: [String],
    example: ['photo1.jpg', 'photo2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({
    description: 'Медиа файлы - документы',
    type: [String],
    example: ['document1.pdf', 'document2.pdf'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({
    description: 'Произвольные поля пользователя',
    type: 'object',
    example: {
      city: 'Milano',
      district: 'Porta Romana', 
      street: 'Via XYZ 10',
      floor: 3,
      balcony: true,
      parking: false,
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'User fields must be an object' })
  userFields?: Record<string, any>;
}
