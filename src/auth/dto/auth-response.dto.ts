import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserDto {
  @ApiProperty({
    example: 'b1e7d72a-4c6b-4a0e-8f7e-9c5d8a2b4e6f',
    description: 'Уникальный идентификатор пользователя'
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Адрес электронной почты пользователя'
  })
  email: string;

  @ApiProperty({
    example: 'ACTIVE',
    enum: UserStatus,
    description: 'Статус пользователя'
  })
  status: UserStatus;
}

export class AuthResponseDto {
  @ApiProperty({
    type: UserDto,
    description: 'Данные пользователя'
  })
  user: UserDto;
}
