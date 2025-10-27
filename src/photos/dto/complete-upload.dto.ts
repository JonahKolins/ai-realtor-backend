import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsInt, 
  IsOptional, 
  Min, 
  Max, 
  IsUUID,
  Length,
  IsIn 
} from 'class-validator';
import { ALLOWED_MIME_TYPES, AllowedMimeType } from '../types/photo.types';

export class CompleteUploadDto {
  @ApiProperty({
    description: 'ID ассета из слота загрузки',
    example: 'photo-uuid-1',
  })
  @IsUUID()
  assetId: string;

  @ApiProperty({
    description: 'S3 ключ загруженного файла',
    example: 'uploads/users/user-id/listings/listing-id/photo-id/orig.heic',
  })
  @IsString()
  @Length(1, 500)
  key: string;

  @ApiProperty({
    description: 'Размер файла в байтах',
    example: 5342332,
    minimum: 1,
    maximum: 20 * 1024 * 1024, // 20MB
  })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  size: number;

  @ApiProperty({
    description: 'Ширина изображения в пикселях',
    example: 4032,
    minimum: 1,
    maximum: 10000,
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  width: number;

  @ApiProperty({
    description: 'Высота изображения в пикселях',
    example: 3024,
    minimum: 1,
    maximum: 10000,
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  height: number;

  @ApiProperty({
    description: 'Оригинальное имя файла',
    example: 'IMG_0001.HEIC',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  originalName?: string;

  @ApiProperty({
    description: 'MIME тип файла',
    example: 'image/heic',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  mime: AllowedMimeType;
}

export class CompleteUploadResponseDto {
  @ApiProperty({
    description: 'Статус обработки',
    example: 'QUEUED',
    enum: ['QUEUED', 'PROCESSING'],
  })
  status: 'QUEUED' | 'PROCESSING';

  @ApiProperty({
    description: 'ID созданной записи фотографии',
    example: 'photo-uuid-1',
  })
  photoId: string;
}
