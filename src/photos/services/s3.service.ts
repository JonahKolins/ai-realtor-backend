import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadSlot, S3KeyPaths } from '../types/photo.types';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly presignedUrlExpires: number;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME');
    this.region = this.configService.get<string>('AWS_REGION');
    this.presignedUrlExpires = 
      this.configService.get<number>('MEDIA_PRESIGNED_URL_EXPIRES_MINUTES', 5) * 60;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Генерирует S3 ключи для фотографии
   */
  generatePhotoKeys(
    userId: string,
    listingId: string,
    photoId: string,
    extension: string
  ): S3KeyPaths {
    const basePath = `users/${userId}/listings/${listingId}/${photoId}`;
    
    return {
      uploads: `uploads/${basePath}/orig.${extension}`,
      processed: `processed/${basePath}`,
      public: `public/${basePath}`,
    };
  }

  /**
   * Генерирует ключ для обработанного изображения
   */
  generateProcessedKey(
    userId: string,
    listingId: string,
    photoId: string,
    size: string,
    format: string
  ): string {
    return `processed/users/${userId}/listings/${listingId}/${photoId}/${size}.${format}`;
  }

  /**
   * Создает pre-signed URL для загрузки
   */
  async generatePresignedUploadUrl(
    key: string,
    mimeType: string,
    maxSize: number
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: mimeType,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: this.presignedUrlExpires,
      });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for key ${key}:`, error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Создает несколько слотов для загрузки
   */
  async generateUploadSlots(
    userId: string,
    listingId: string,
    count: number,
    mimeTypes?: string[]
  ): Promise<{ slots: UploadSlot[]; expiresInSeconds: number }> {
    const slots: UploadSlot[] = [];
    const maxSize = this.configService.get<number>('MEDIA_MAX_FILE_SIZE_MB', 20) * 1024 * 1024;

    for (let i = 0; i < count; i++) {
      const photoId = this.generatePhotoId();
      const mimeType = mimeTypes?.[i] || 'image/jpeg';
      const extension = this.getExtensionFromMime(mimeType);
      
      const keys = this.generatePhotoKeys(userId, listingId, photoId, extension);
      const uploadUrl = await this.generatePresignedUploadUrl(
        keys.uploads,
        mimeType,
        maxSize
      );

      slots.push({
        assetId: photoId,
        key: keys.uploads,
        uploadUrl,
      });
    }

    return {
      slots,
      expiresInSeconds: this.presignedUrlExpires,
    };
  }

  /**
   * Проверяет существование объекта в S3
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Загружает объект в S3
   */
  async uploadObject(
    key: string,
    body: Buffer,
    mimeType: string,
    cacheControl?: string
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: mimeType,
        CacheControl: cacheControl || 'public, max-age=31536000, immutable',
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded object to S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload object to S3 ${key}:`, error);
      throw new Error('Failed to upload to S3');
    }
  }

  /**
   * Получает объект из S3
   */
  async getObject(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to get object from S3 ${key}:`, error);
      throw new Error('Failed to get object from S3');
    }
  }

  /**
   * Удаляет объект из S3
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted object from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object from S3 ${key}:`, error);
      throw new Error('Failed to delete from S3');
    }
  }

  /**
   * Удаляет несколько объектов из S3
   */
  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
        },
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted ${keys.length} objects from S3`);
    } catch (error) {
      this.logger.error(`Failed to delete objects from S3:`, error);
      throw new Error('Failed to delete objects from S3');
    }
  }

  /**
   * Генерирует уникальный ID для фотографии
   */
  private generatePhotoId(): string {
    // Используем стандартную функцию генерации UUID из crypto
    return randomUUID();
  }

  /**
   * Получает расширение файла из MIME типа
   */
  private getExtensionFromMime(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    };

    return mimeMap[mimeType] || 'jpg';
  }
}
