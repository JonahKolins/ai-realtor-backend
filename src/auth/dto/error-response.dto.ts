import { ApiProperty } from '@nestjs/swagger';

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  USER_BLOCKED = 'USER_BLOCKED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class ErrorResponseDto {
  @ApiProperty({
    example: 'INVALID_CREDENTIALS',
    enum: AuthErrorCode,
    description: 'Код ошибки'
  })
  code: string;

  @ApiProperty({
    example: 'Неверные учетные данные',
    description: 'Описание ошибки'
  })
  message: string;
}
