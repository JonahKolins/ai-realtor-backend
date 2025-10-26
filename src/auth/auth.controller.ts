import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ValidationPipe } from '../common/pipes/validation.pipe';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { RequestWithUser } from './types/auth.types';

@ApiTags('Аутентификация')
@Controller('auth')
@UsePipes(new ValidationPipe())
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    description: 'Пользователь успешно зарегистрирован',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email уже используется',
    type: ErrorResponseDto,
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get('User-Agent');

      const result = await this.authService.register(dto, ipAddress, userAgent);

      // Устанавливаем cookie с сессией
      this.setSessionCookie(res, result.sessionId);

      return res.status(HttpStatus.OK).json({
        user: result.user,
      });
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Успешная аутентификация',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Неверные учетные данные',
    type: ErrorResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get('User-Agent');

      const result = await this.authService.login(dto, ipAddress, userAgent);

      // Устанавливаем cookie с сессией
      this.setSessionCookie(res, result.sessionId);

      return res.status(HttpStatus.OK).json({
        user: result.user,
      });
    } catch (error) {
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Выход из системы' })
  @ApiResponse({
    status: 204,
    description: 'Успешный выход из системы',
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
    type: ErrorResponseDto,
  })
  async logout(@Req() req: RequestWithUser, @Res() res: Response) {
    await this.authService.logout(req.sessionId);

    // Удаляем cookie
    this.clearSessionCookie(res);

    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Выход из всех устройств' })
  @ApiResponse({
    status: 204,
    description: 'Успешный выход из всех устройств',
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
    type: ErrorResponseDto,
  })
  async logoutAll(@Req() req: RequestWithUser, @Res() res: Response) {
    await this.authService.logoutAll(req.user.id);

    // Удаляем cookie
    this.clearSessionCookie(res);

    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные текущего пользователя',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Не авторизован',
    type: ErrorResponseDto,
  })
  async getCurrentUser(@Req() req: RequestWithUser) {
    return {
      user: req.user,
    };
  }

  /**
   * Устанавливает cookie с ID сессии
   */
  private setSessionCookie(res: Response, sessionId: string): void {
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    const cookieSecure = this.configService.get<boolean>('COOKIE_SECURE', true);
    const cookieSameSite = this.configService.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE', 'lax');
    const sessionIdleDays = this.configService.get<number>('SESSION_IDLE_DAYS', 7);

    const maxAge = sessionIdleDays * 24 * 60 * 60 * 1000; // в миллисекундах

    res.cookie('sid', sessionId, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
      domain: cookieDomain,
      maxAge,
    });
  }

  /**
   * Удаляет cookie с ID сессии
   */
  private clearSessionCookie(res: Response): void {
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    res.cookie('sid', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: cookieDomain,
      maxAge: 0,
    });
  }

  /**
   * Получает IP адрес клиента с учетом прокси
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}
