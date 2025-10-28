import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsArray, IsString, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ALLOWED_MIME_TYPES, AllowedMimeType } from '../types/photo.types';

export class CreateUploadSlotsDto {
  @ApiProperty({
    description: 'Количество слотов для загрузки',
    minimum: 1,
    maximum: 10,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  count: number;

  @ApiProperty({
    description: 'MIME типы для каждого слота',
    type: [String],
    enum: ALLOWED_MIME_TYPES,
    required: false,
    example: ['image/jpeg', 'image/heic'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(ALLOWED_MIME_TYPES, { each: true })
  mimeTypes?: AllowedMimeType[];
}

export class UploadSlotResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор слота',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  assetId: string;

  @ApiProperty({
    description: 'S3 ключ для загрузки',
    example: 'uploads/users/user-id/listings/listing-id/photo-id/orig.heic',
  })
  key: string;

  @ApiProperty({
    description: 'Pre-signed URL для PUT запроса',
    example: 'https://s3.amazonaws.com/bucket/key?...',
  })
  uploadUrl: string;
}

export class CreateUploadSlotsResponseDto {
  @ApiProperty({
    description: 'Список слотов для загрузки',
    type: [UploadSlotResponseDto],
  })
  items: UploadSlotResponseDto[];

  @ApiProperty({
    description: 'Время истечения URL в секундах',
    example: 300,
  })
  expiresInSeconds: number;
}
