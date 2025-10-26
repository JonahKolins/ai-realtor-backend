import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { HashService } from './services/hash.service';
import { SessionCleanupService } from './services/session-cleanup.service';
import { AuthGuard } from './guards/auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    HashService,
    SessionCleanupService,
    AuthGuard,
  ],
  exports: [
    AuthService,
    SessionService,
    HashService,
    AuthGuard,
  ],
})
export class AuthModule {}
