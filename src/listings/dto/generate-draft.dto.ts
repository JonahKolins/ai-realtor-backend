import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsIn,
  IsArray,
  ValidateNested,
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
