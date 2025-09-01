import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Проверка критически важных переменных окружения
  if (!process.env.DATABASE_URL) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: DATABASE_URL не найдена!');
    console.error('📋 Убедитесь что PostgreSQL добавлен в Railway проект');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL настроена корректно');
  
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'development' 
      ? ['log', 'debug', 'error', 'verbose', 'warn'] 
      : ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix for API routes (except health)
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'], // health endpoint should be without prefix
  });

  // CORS configuration
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Realtor API')
    .setDescription('AI Realtor Backend API Service')
    .setVersion('0.1.0')
    .addTag('System', 'System endpoints (health, config)')
    .addTag('Listings', 'Real estate listings management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Make docs-json available
  app.getHttpAdapter().get('/docs-json', (req, res) => {
    res.json(document);
  });

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger documentation: http://localhost:${port}/docs`);
  logger.log(`📄 Swagger JSON: http://localhost:${port}/docs-json`);
  logger.log(`💗 Health check: http://localhost:${port}/health`);
  logger.log(`⚙️  Config endpoint: http://localhost:${port}${apiPrefix}/config`);
  logger.log(`📋 Listings API: http://localhost:${port}${apiPrefix}/listings`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.log(`🌍 CORS enabled for: ${corsOrigin}`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
