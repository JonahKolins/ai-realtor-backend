import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsArray, IsUUID } from 'class-validator';

export class UpdatePhotoCoverDto {
  @ApiProperty({
    description: 'Установить как обложку объявления',
    example: true,
  })
  @IsBoolean()
  isCover: boolean;
}

export class UpdatePhotoOrderDto {
  @ApiProperty({
    description: 'Массив ID фотографий в желаемом порядке',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class PhotoOperationResponseDto {
  @ApiProperty({
    description: 'Результат операции',
    example: true,
  })
  ok: boolean;
}

export class DeletePhotoResponseDto {
  @ApiProperty({
    description: 'Флаг успешного удаления',
    example: true,
  })
  deleted: boolean;
}

export class DeleteAllPhotosResponseDto {
  @ApiProperty({
    description: 'Количество удаленных фотографий',
    example: 5,
  })
  deleted: number;
}
