import { ApiProperty } from '@nestjs/swagger';
import { PhotoStatus } from '@prisma/client';
import { PhotoVariants } from '../types/photo.types';

export class PhotoVariantsDto {
  @ApiProperty({
    description: 'WebP варианты изображения',
    type: 'object',
    example: {
      w1600: 'processed/users/user-id/listings/listing-id/photo-id/w1600.webp',
      w1024: 'processed/users/user-id/listings/listing-id/photo-id/w1024.webp',
      w512: 'processed/users/user-id/listings/listing-id/photo-id/w512.webp',
    },
  })
  webp?: {
    w1600?: string;
    w1024?: string;
    w512?: string;
  };

  @ApiProperty({
    description: 'AVIF варианты изображения',
    type: 'object',
    example: {
      w1600: 'processed/users/user-id/listings/listing-id/photo-id/w1600.avif',
    },
  })
  avif?: {
    w1600?: string;
    w1024?: string;
    w512?: string;
  };
}

export class PhotoResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор фотографии',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Статус обработки фотографии',
    enum: PhotoStatus,
    example: PhotoStatus.READY,
  })
  status: PhotoStatus;

  @ApiProperty({
    description: 'Является ли фотография обложкой объявления',
    example: true,
  })
  isCover: boolean;

  @ApiProperty({
    description: 'Порядок сортировки фотографии',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'MIME тип фотографии',
    example: 'image/webp',
  })
  mime: string | null;

  @ApiProperty({
    description: 'Ширина изображения в пикселях',
    example: 1600,
  })
  width: number | null;

  @ApiProperty({
    description: 'Высота изображения в пикселях',
    example: 1067,
  })
  height: number | null;

  @ApiProperty({
    description: 'Варианты изображения в разных форматах и размерах',
    type: PhotoVariantsDto,
  })
  variants: PhotoVariants | null;

  @ApiProperty({
    description: 'Базовый URL CDN для формирования полных ссылок',
    example: 'https://media.casalabia.dev/',
  })
  cdnBaseUrl: string;

  @ApiProperty({
    description: 'Время создания записи',
    example: '2023-10-27T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Время последнего обновления',
    example: '2023-10-27T12:05:00Z',
  })
  updatedAt: Date;
}
