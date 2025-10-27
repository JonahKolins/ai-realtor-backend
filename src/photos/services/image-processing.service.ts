import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import {
  ImageProcessingConfig,
  ImageProcessingResult,
  ProcessedImageVariant,
  IMAGE_SIZES,
  OUTPUT_FORMATS,
  PhotoMetadata,
  UploadValidationResult,
} from '../types/photo.types';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly config: ImageProcessingConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      quality: {
        webp: this.configService.get<number>('IMAGE_QUALITY_WEBP', 85),
        avif: this.configService.get<number>('IMAGE_QUALITY_AVIF', 75),
      },
      sizes: ['w1600', 'w1024', 'w512'],
      formats: ['webp', 'avif'],
      maxFileSize: this.configService.get<number>('MEDIA_MAX_FILE_SIZE_MB', 20) * 1024 * 1024,
      maxDimension: 8000,
      minDimension: 100,
    };
  }

  /**
   * Валидирует загруженное изображение
   */
  async validateImage(buffer: Buffer, metadata: PhotoMetadata): Promise<UploadValidationResult> {
    try {
      // Проверка размера файла
      if (buffer.length > this.config.maxFileSize) {
        return {
          valid: false,
          error: `Файл слишком большой: ${buffer.length} байт, максимум: ${this.config.maxFileSize} байт`,
        };
      }

      // Получение метаданных изображения через Sharp
      const sharpImage = sharp(buffer);
      const sharpMetadata = await sharpImage.metadata();

      // Проверка минимальных размеров
      if (
        !sharpMetadata.width ||
        !sharpMetadata.height ||
        Math.min(sharpMetadata.width, sharpMetadata.height) < this.config.minDimension
      ) {
        return {
          valid: false,
          error: `Минимальная сторона изображения должна быть ${this.config.minDimension}px`,
        };
      }

      // Проверка максимальных размеров
      if (
        Math.max(sharpMetadata.width, sharpMetadata.height) > this.config.maxDimension
      ) {
        return {
          valid: false,
          error: `Максимальная сторона изображения должна быть ${this.config.maxDimension}px`,
        };
      }

      // Проверка соответствия метаданных
      if (
        sharpMetadata.width !== metadata.width ||
        sharpMetadata.height !== metadata.height
      ) {
        this.logger.warn(
          `Metadata mismatch: provided ${metadata.width}x${metadata.height}, ` +
          `actual ${sharpMetadata.width}x${sharpMetadata.height}`
        );
      }

      return {
        valid: true,
        normalizedMime: this.getNormalizedMimeType(sharpMetadata.format || metadata.mime),
      };
    } catch (error) {
      this.logger.error('Image validation failed:', error);
      return {
        valid: false,
        error: 'Не удалось обработать изображение',
      };
    }
  }

  /**
   * Обрабатывает изображение и создает все варианты
   */
  async processImage(
    originalBuffer: Buffer,
    userId: string,
    listingId: string,
    photoId: string
  ): Promise<ImageProcessingResult> {
    const variants: ProcessedImageVariant[] = [];
    
    try {
      // Создание базового объекта Sharp с удалением EXIF и нормализацией ориентации
      const baseImage = sharp(originalBuffer)
        .rotate() // автоматическая коррекция ориентации на основе EXIF
        .jpeg({ quality: 90 }); // промежуточное качество для обработки

      const originalMetadata = await baseImage.metadata();
      
      if (!originalMetadata.width || !originalMetadata.height) {
        throw new Error('Не удалось получить размеры изображения');
      }

      // Генерация вариантов для каждого размера и формата
      for (const sizeKey of this.config.sizes) {
        const targetWidth = IMAGE_SIZES[sizeKey].width;
        
        // Пропускаем если изображение меньше целевого размера
        if (originalMetadata.width < targetWidth) {
          continue;
        }

        for (const format of this.config.formats) {
          try {
            const variant = await this.createImageVariant(
              baseImage.clone(),
              targetWidth,
              format,
              userId,
              listingId,
              photoId,
              sizeKey
            );

            variants.push(variant);
          } catch (error) {
            this.logger.error(
              `Failed to create variant ${sizeKey}.${format}:`,
              error
            );
          }
        }
      }

      if (variants.length === 0) {
        throw new Error('Не удалось создать ни одного варианта изображения');
      }

      return {
        variants,
        success: true,
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      return {
        variants: [],
        success: false,
        error: error.message || 'Ошибка обработки изображения',
      };
    }
  }

  /**
   * Создает отдельный вариант изображения
   */
  private async createImageVariant(
    image: sharp.Sharp,
    targetWidth: number,
    format: string,
    userId: string,
    listingId: string,
    photoId: string,
    sizeKey: string
  ): Promise<ProcessedImageVariant> {
    let processedImage = image.resize({
      width: targetWidth,
      height: undefined, // пропорциональное масштабирование
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    });

    // Применение формата и качества
    if (format === 'webp') {
      processedImage = processedImage.webp({ 
        quality: this.config.quality.webp,
        effort: 4,
      });
    } else if (format === 'avif') {
      processedImage = processedImage.avif({ 
        quality: this.config.quality.avif,
        effort: 4,
      });
    }

    const buffer = await processedImage.toBuffer();
    const metadata = await sharp(buffer).metadata();

    const key = `processed/users/${userId}/listings/${listingId}/${photoId}/${sizeKey}.${format}`;

    return {
      key,
      width: metadata.width || targetWidth,
      height: metadata.height || 0,
      size: buffer.length,
      format,
    };
  }

  /**
   * Извлекает метаданные изображения
   */
  async extractMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to extract metadata:', error);
      throw new Error('Не удалось извлечь метаданные изображения');
    }
  }

  /**
   * Нормализует MIME тип на основе формата изображения
   */
  private getNormalizedMimeType(format: string): string {
    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heic',
    };

    return formatMap[format.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Конвертирует HEIC в JPEG для совместимости
   */
  async convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate()
        .jpeg({ quality: 95 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to convert HEIC to JPEG:', error);
      throw new Error('Не удалось конвертировать HEIC изображение');
    }
  }

  /**
   * Получает конфигурацию обработки изображений
   */
  getProcessingConfig(): ImageProcessingConfig {
    return this.config;
  }
}
