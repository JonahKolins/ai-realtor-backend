import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HashService } from './hash.service';
import { CreateSessionOptions, SessionWithUser } from '../types/auth.types';
import { Session } from '@prisma/client';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private configService: ConfigService,
  ) {}

  /**
   * Создает новую сессию пользователя
   */
  async createSession(options: CreateSessionOptions): Promise<Session> {
    const idleDays = this.configService.get<number>('SESSION_IDLE_DAYS', 7);
    const absoluteDays = this.configService.get<number>('SESSION_ABSOLUTE_DAYS', 30);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + idleDays * 24 * 60 * 60 * 1000);
    const absoluteLimit = new Date(now.getTime() + absoluteDays * 24 * 60 * 60 * 1000);

    // Используем меньшую из двух дат
    const finalExpiresAt = expiresAt < absoluteLimit ? expiresAt : absoluteLimit;

    const session = await this.prisma.session.create({
      data: {
        userId: options.userId,
        expiresAt: finalExpiresAt,
        ipHash: options.ipAddress ? this.hashService.hashIp(options.ipAddress) : null,
        uaHash: options.userAgent ? this.hashService.hashUserAgent(options.userAgent) : null,
      },
    });

    this.logger.log(`Session created for user ${options.userId}: ${session.id}`);
    return session;
  }

  /**
   * Находит активную сессию по ID
   */
  async findActiveSession(sessionId: string): Promise<SessionWithUser | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    return session;
  }

  /**
   * Обновляет активность сессии (продлевает срок)
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const idleDays = this.configService.get<number>('SESSION_IDLE_DAYS', 7);
    const absoluteDays = this.configService.get<number>('SESSION_ABSOLUTE_DAYS', 30);
    
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + idleDays * 24 * 60 * 60 * 1000);
    const absoluteLimit = new Date(session.createdAt.getTime() + absoluteDays * 24 * 60 * 60 * 1000);

    // Не продлеваем сессию сверх absolute лимита
    const finalExpiresAt = newExpiresAt < absoluteLimit ? newExpiresAt : absoluteLimit;

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: now,
        expiresAt: finalExpiresAt,
      },
    });
  }

  /**
   * Отзывает (закрывает) текущую сессию
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Session revoked: ${sessionId}`);
  }

  /**
   * Отзывает все активные сессии пользователя
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`All sessions revoked for user: ${userId}`);
  }

  /**
   * Очистка просроченных и отозванных сессий
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired/revoked sessions`);
    return result.count;
  }

  /**
   * Получить статистику по сессиям
   */
  async getSessionStats() {
    const [total, active, expired] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.session.count({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } },
          ],
        },
      }),
    ]);

    return { total, active, expired };
  }
}
