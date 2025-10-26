import { Injectable, ConflictException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HashService } from './hash.service';
import { SessionService } from './session.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthUser } from '../types/auth.types';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private sessionService: SessionService,
  ) {}

  /**
   * Регистрация нового пользователя
   */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'Пользователь с таким email уже существует',
      });
    }

    // Хешируем пароль
    const passwordHash = await this.hashService.hashPassword(dto.password);

    // Создаем пользователя
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    // Создаем сессию
    const session = await this.sessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      sessionId: session.id,
    };
  }

  /**
   * Аутентификация пользователя
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Ищем пользователя по email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Проверяем пользователя и пароль
    if (!user || !(await this.hashService.verifyPassword(dto.password, user.passwordHash))) {
      // Логируем неудачную попытку входа
      this.logger.warn(`Failed login attempt for email: ${dto.email} from IP: ${ipAddress}`);
      
      throw new BadRequestException({
        code: 'INVALID_CREDENTIALS',
        message: 'Неверные учетные данные',
      });
    }

    // Проверяем статус пользователя
    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException({
        code: 'USER_BLOCKED',
        message: 'Учетная запись заблокирована',
      });
    }

    // Создаем новую сессию (при входе старые не отзываем, пользователь может быть авторизован с нескольких устройств)
    const session = await this.sessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged in: ${user.email} (${user.id}) from IP: ${ipAddress}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      sessionId: session.id,
    };
  }

  /**
   * Выход из системы (отзыв текущей сессии)
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
    this.logger.log(`User logged out, session: ${sessionId}`);
  }

  /**
   * Выход из всех устройств (отзыв всех сессий пользователя)
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId);
    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  /**
   * Получение текущего пользователя по сессии
   */
  async getCurrentUser(sessionId: string): Promise<AuthUser> {
    const sessionWithUser = await this.sessionService.findActiveSession(sessionId);
    
    if (!sessionWithUser) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Недействительная или просроченная сессия',
      });
    }

    // Обновляем активность сессии
    await this.sessionService.updateSessionActivity(sessionId);

    return {
      id: sessionWithUser.user.id,
      email: sessionWithUser.user.email,
      status: sessionWithUser.user.status,
    };
  }

  /**
   * Валидация сессии (для middleware)
   */
  async validateSession(sessionId: string): Promise<AuthUser | null> {
    try {
      const sessionWithUser = await this.sessionService.findActiveSession(sessionId);
      
      if (!sessionWithUser || sessionWithUser.user.status === UserStatus.BLOCKED) {
        return null;
      }

      // Обновляем активность сессии
      await this.sessionService.updateSessionActivity(sessionId);

      return {
        id: sessionWithUser.user.id,
        email: sessionWithUser.user.email,
        status: sessionWithUser.user.status,
      };
    } catch (error) {
      this.logger.error(`Session validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Получение пользователя по ID
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
