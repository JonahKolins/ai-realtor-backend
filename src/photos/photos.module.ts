import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { S3Service } from './services/s3.service';
import { ImageProcessingService } from './services/image-processing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [PhotosController],
  providers: [
    PhotosService,
    S3Service,
    ImageProcessingService,
    PrismaService,
  ],
  exports: [PhotosService, S3Service],
})
export class PhotosModule {}
