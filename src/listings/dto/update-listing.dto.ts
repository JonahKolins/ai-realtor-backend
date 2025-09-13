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
