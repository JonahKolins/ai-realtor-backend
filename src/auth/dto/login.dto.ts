import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Адрес электронной почты пользователя'
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'Пароль пользователя'
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  password: string;
}
