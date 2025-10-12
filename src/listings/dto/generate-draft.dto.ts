import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsIn,
  IsArray,
  ValidateNested,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Tone {
  PROFESSIONALE = 'professionale',
  INFORMALE = 'informale',
  PREMIUM = 'premium',
}

export enum Length {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
}

export class GenerateDraftDto {
  @ApiProperty({
    description: 'Локаль в формате BCP-47',
    example: 'it-IT',
    default: 'it-IT',
    required: false,
  })
  @IsOptional()
  @IsString()
  locale?: string = 'it-IT';

  @ApiProperty({
    description: 'Тон описания',
    enum: Tone,
    example: Tone.PROFESSIONALE,
    default: Tone.PROFESSIONALE,
    required: false,
  })
  @IsOptional()
  @IsEnum(Tone)
  tone?: Tone = Tone.PROFESSIONALE;

  @ApiProperty({
    description: 'Длина описания',
    enum: Length,
    example: Length.MEDIUM,
    default: Length.MEDIUM,
    required: false,
  })
  @IsOptional()
  @IsEnum(Length)
  length?: Length = Length.MEDIUM;
}

export class SeoDto {
  @ApiProperty({
    description: 'SEO ключевые слова',
    type: [String],
    example: ['appartamento', 'affitto Milano', 'trilocale'],
  })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({
    description: 'SEO мета-описание',
    example: 'Trilocale ristrutturato in centro...',
  })
  @IsString()
  metaDescription: string;
}

export class ListingDraftDto {
  @ApiProperty({
    description: 'Заголовок объявления',
    example: 'Luminoso trilocale con balcone in centro',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Краткое описание',
    example: 'Trilocale ristrutturato vicino alla metro...',
  })
  @IsString()
  summary: string;

  @ApiProperty({
    description: 'Полное описание объявления',
    example: 'A due passi da ...',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Ключевые особенности объекта',
    type: [String],
    example: ['Cucina abitabile', 'Doppia esposizione', 'Riscaldamento autonomo'],
  })
  @IsArray()
  @IsString({ each: true })
  highlights: string[];

  @ApiProperty({
    description: 'Дисклеймер',
    example: 'Le informazioni sono indicative e non costituiscono vincolo contrattuale.',
  })
  @IsString()
  disclaimer: string;

  @ApiProperty({
    description: 'SEO данные',
    type: SeoDto,
  })
  @ValidateNested()
  @Type(() => SeoDto)
  seo: SeoDto;
}

// DTO для сохранения черновика объявления
export class SaveDraftDto {
  @ApiProperty({
    description: 'ID объявления (опционально для создания нового)',
    example: 'listing-id-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Тип листинга',
    enum: ['sale', 'rent'],
    example: 'sale',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['sale', 'rent'])
  type?: string;

  @ApiProperty({
    description: 'Тип недвижимости',
    example: 'apartment',
    required: false,
  })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiProperty({
    description: 'Заголовок объявления',
    example: 'Luminoso trilocale con balcone in centro',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Краткое описание',
    example: 'Trilocale ristrutturato vicino alla metro...',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Полное описание объявления',
    example: 'A due passi da Porta Romana...',
    required: false,
  })
  @IsOptional()
  @IsString()
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
    example: 'Trilocale ristrutturato in centro...',
    required: false,
  })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({
    description: 'Цена объекта',
    example: 250000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

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
  @IsObject()
  userFields?: Record<string, any>;
}
