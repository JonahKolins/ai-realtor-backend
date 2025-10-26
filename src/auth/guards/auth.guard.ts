import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RequestWithUser } from '../types/auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // Извлекаем session ID из cookie
      const sessionId = request.cookies?.sid;

      if (!sessionId) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Отсутствует сессия',
        });
      }

      // Валидируем сессию
      const user = await this.authService.validateSession(sessionId);

      if (!user) {
        // Если сессия недействительна, удаляем cookie
        response.clearCookie('sid');
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Недействительная или просроченная сессия',
        });
      }

      // Добавляем пользователя и session ID в request
      (request as any).user = user;
      (request as any).sessionId = sessionId;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Auth guard error: ${error.message}`);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Ошибка аутентификации',
      });
    }
  }
}
