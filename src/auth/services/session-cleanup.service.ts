import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private sessionService: SessionService) {}

  /**
   * Ежедневная очистка просроченных и отозванных сессий
   * Выполняется каждый день в 02:00 UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredSessions() {
    try {
      this.logger.log('Starting daily session cleanup...');
      
      const deletedCount = await this.sessionService.cleanupExpiredSessions();
      
      this.logger.log(`Session cleanup completed. Deleted ${deletedCount} sessions.`);
    } catch (error) {
      this.logger.error(`Session cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Получение статистики сессий для мониторинга
   * Выполняется каждый час
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logSessionStats() {
    try {
      const stats = await this.sessionService.getSessionStats();
      
      this.logger.log(
        `Session stats - Total: ${stats.total}, Active: ${stats.active}, Expired: ${stats.expired}`
      );
      
      // Если слишком много просроченных сессий, запускаем внеплановую очистку
      if (stats.expired > 1000) {
        this.logger.warn('High number of expired sessions detected. Running cleanup...');
        await this.sessionService.cleanupExpiredSessions();
      }
    } catch (error) {
      this.logger.error(`Failed to get session stats: ${error.message}`);
    }
  }
}
