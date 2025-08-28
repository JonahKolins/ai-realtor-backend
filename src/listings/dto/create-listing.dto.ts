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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ListingType } from '../types/listing.types';

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
