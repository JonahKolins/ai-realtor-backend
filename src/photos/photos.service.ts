import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { ImageProcessingService } from './services/image-processing.service';
import { PhotoStatus, Photo } from '@prisma/client';
import { 
  UploadSlot, 
  PhotoVariants, 
  PhotoMetadata,
  CdnUrls,
} from './types/photo.types';
import {
  CreateUploadSlotsDto,
  CreateUploadSlotsResponseDto,
} from './dto/create-upload-slots.dto';
import {
  CompleteUploadDto,
  CompleteUploadResponseDto,
} from './dto/complete-upload.dto';
import { PhotoResponseDto } from './dto/photo-response.dto';
import {
  UpdatePhotoCoverDto,
  UpdatePhotoOrderDto,
  PhotoOperationResponseDto,
  DeletePhotoResponseDto,
  DeleteAllPhotosResponseDto,
} from './dto/photo-operations.dto';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly cdnBaseUrl: string;
  private readonly maxFilesPerListing: number;

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private imageProcessingService: ImageProcessingService,
    private configService: ConfigService,
  ) {
    this.cdnBaseUrl = this.configService.get<string>('CDN_BASE_URL', 'https://media.casalabia.dev');
    this.maxFilesPerListing = this.configService.get<number>('MEDIA_MAX_FILES_PER_LISTING', 30);
  }

  /**
   * Создает слоты для загрузки фотографий
   */
  async createUploadSlots(
    listingId: string,
    userId: string,
    dto: CreateUploadSlotsDto
  ): Promise<CreateUploadSlotsResponseDto> {
    // Проверяем существование объявления
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { _count: { select: { photoEntries: true } } },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    // Проверяем лимит фотографий
    const currentPhotoCount = listing._count.photoEntries;
    if (currentPhotoCount + dto.count > this.maxFilesPerListing) {
      throw new BadRequestException(
        `Превышен лимит фотографий. Текущее количество: ${currentPhotoCount}, ` +
        `запрашивается: ${dto.count}, максимум: ${this.maxFilesPerListing}`
      );
    }

    try {
      // Генерируем слоты для загрузки
      const { slots, expiresInSeconds } = await this.s3Service.generateUploadSlots(
        userId,
        listingId,
        dto.count,
        dto.mimeTypes
      );

      // Создаем записи в БД со статусом UPLOADING
      const photoPromises = slots.map(slot => 
        this.prisma.photo.create({
          data: {
            id: slot.assetId,
            listingId,
            s3KeyOriginal: slot.key,
            status: PhotoStatus.UPLOADING,
            uploadedBy: userId,
            sortOrder: currentPhotoCount + slots.indexOf(slot),
          },
        })
      );

      await Promise.all(photoPromises);

      return {
        items: slots,
        expiresInSeconds,
      };
    } catch (error) {
      this.logger.error('Failed to create upload slots:', error);
      throw new BadRequestException('Не удалось создать слоты для загрузки');
    }
  }

  /**
   * Подтверждает завершение загрузки и запускает обработку
   */
  async completeUpload(
    listingId: string,
    userId: string,
    dto: CompleteUploadDto
  ): Promise<CompleteUploadResponseDto> {
    // Находим запись фотографии
    const photo = await this.prisma.photo.findUnique({
      where: { id: dto.assetId },
      include: { listing: true },
    });

    if (!photo) {
      throw new NotFoundException('Фотография не найдена');
    }

    if (photo.listing.id !== listingId) {
      throw new BadRequestException('Фотография не принадлежит указанному объявлению');
    }

    if (photo.status !== PhotoStatus.UPLOADING) {
      throw new BadRequestException('Фотография уже обработана или находится в обработке');
    }

    // Проверяем соответствие ключа
    if (photo.s3KeyOriginal !== dto.key) {
      throw new BadRequestException('Неверный ключ S3');
    }

    try {
      // Проверяем существование файла в S3
      const exists = await this.s3Service.objectExists(dto.key);
      if (!exists) {
        throw new BadRequestException('Файл не найден в S3');
      }

      // Обновляем метаданные в БД
      await this.prisma.photo.update({
        where: { id: photo.id },
        data: {
          mime: dto.mime,
          width: dto.width,
          height: dto.height,
          sizeBytes: dto.size,
          originalName: dto.originalName,
          status: PhotoStatus.PROCESSING,
        },
      });

      // Запускаем асинхронную обработку изображения
      this.processImageAsync(photo.id, userId, listingId, dto);

      return {
        status: 'PROCESSING',
        photoId: photo.id,
      };
    } catch (error) {
      this.logger.error(`Failed to complete upload for photo ${dto.assetId}:`, error);
      
      // Обновляем статус на FAILED
      await this.prisma.photo.update({
        where: { id: photo.id },
        data: { status: PhotoStatus.FAILED },
      }).catch(() => {});

      throw new BadRequestException('Не удалось подтвердить загрузку');
    }
  }

  /**
   * Получает список фотографий объявления
   */
  async getPhotosByListing(listingId: string): Promise<PhotoResponseDto[]> {
    const photos = await this.prisma.photo.findMany({
      where: { listingId },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return photos.map(photo => this.mapPhotoToDto(photo));
  }

  /**
   * Устанавливает фотографию как обложку
   */
  async updatePhotoCover(
    listingId: string,
    photoId: string,
    dto: UpdatePhotoCoverDto
  ): Promise<PhotoOperationResponseDto> {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException('Фотография не найдена');
    }

    if (photo.status !== PhotoStatus.READY) {
      throw new BadRequestException('Фотография еще не готова');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        // Снимаем флаг обложки с других фотографий
        await tx.photo.updateMany({
          where: { listingId, isCover: true },
          data: { isCover: false },
        });
      }

      // Устанавливаем новую обложку
      await tx.photo.update({
        where: { id: photoId },
        data: { isCover: dto.isCover },
      });
    });

    return { ok: true };
  }

  /**
   * Обновляет порядок фотографий
   */
  async updatePhotoOrder(
    listingId: string,
    dto: UpdatePhotoOrderDto
  ): Promise<PhotoOperationResponseDto> {
    // Проверяем что все фотографии существуют и принадлежат объявлению
    const photos = await this.prisma.photo.findMany({
      where: {
        id: { in: dto.ids },
        listingId,
      },
    });

    if (photos.length !== dto.ids.length) {
      throw new BadRequestException('Некоторые фотографии не найдены');
    }

    // Обновляем порядок сортировки
    const updates = dto.ids.map((id, index) =>
      this.prisma.photo.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updates);

    return { ok: true };
  }

  /**
   * Удаляет фотографию
   */
  async deletePhoto(listingId: string, photoId: string): Promise<DeletePhotoResponseDto> {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException('Фотография не найдена');
    }

    await this.prisma.$transaction(async (tx) => {
      // Удаляем запись из БД
      await tx.photo.delete({
        where: { id: photoId },
      });

      // Если это была обложка, назначаем новую
      if (photo.isCover) {
        const newCover = await tx.photo.findFirst({
          where: { listingId },
          orderBy: { sortOrder: 'asc' },
        });

        if (newCover) {
          await tx.photo.update({
            where: { id: newCover.id },
            data: { isCover: true },
          });
        }
      }
    });

    // Удаляем файлы из S3 асинхронно
    this.deletePhotoFilesAsync(photo);

    return { deleted: true };
  }

  /**
   * Удаляет все фотографии объявления
   */
  async deleteAllPhotos(listingId: string): Promise<DeleteAllPhotosResponseDto> {
    const photos = await this.prisma.photo.findMany({
      where: { listingId },
    });

    if (photos.length === 0) {
      return { deleted: 0 };
    }

    // Удаляем записи из БД
    await this.prisma.photo.deleteMany({
      where: { listingId },
    });

    // Удаляем файлы из S3 асинхронно
    this.deleteMultiplePhotosFilesAsync(photos);

    return { deleted: photos.length };
  }

  /**
   * Асинхронная обработка изображения
   */
  private async processImageAsync(
    photoId: string,
    userId: string,
    listingId: string,
    metadata: PhotoMetadata
  ): Promise<void> {
    try {
      const photo = await this.prisma.photo.findUnique({
        where: { id: photoId },
      });

      if (!photo || !photo.s3KeyOriginal) {
        throw new Error('Фотография или ключ S3 не найден');
      }

      // Получаем оригинальное изображение из S3
      const originalBuffer = await this.s3Service.getObject(photo.s3KeyOriginal);

      // Валидируем изображение
      const validation = await this.imageProcessingService.validateImage(originalBuffer, metadata);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Обрабатываем изображение
      const processingResult = await this.imageProcessingService.processImage(
        originalBuffer,
        userId,
        listingId,
        photoId
      );

      if (!processingResult.success) {
        throw new Error(processingResult.error);
      }

      // Загружаем обработанные варианты в S3
      const variants: PhotoVariants = {};
      for (const variant of processingResult.variants) {
        const buffer = await this.s3Service.getObject(variant.key);
        await this.s3Service.uploadObject(
          variant.key,
          buffer,
          `image/${variant.format}`,
          'public, max-age=31536000, immutable'
        );

        // Группируем по формату
        if (!variants[variant.format as keyof PhotoVariants]) {
          variants[variant.format as keyof PhotoVariants] = {};
        }
        
        const sizeKey = variant.key.split('/').pop()?.split('.')[0]; // извлекаем w1600, w1024 и т.д.
        if (sizeKey) {
          (variants[variant.format as keyof PhotoVariants] as any)[sizeKey] = variant.key;
        }
      }

      // Обновляем запись в БД
      await this.prisma.photo.update({
        where: { id: photoId },
        data: {
          s3KeyVariants: variants,
          status: PhotoStatus.READY,
        },
      });

      this.logger.log(`Successfully processed photo ${photoId}`);
    } catch (error) {
      this.logger.error(`Failed to process photo ${photoId}:`, error);

      // Обновляем статус на FAILED
      await this.prisma.photo.update({
        where: { id: photoId },
        data: { status: PhotoStatus.FAILED },
      }).catch(() => {});
    }
  }

  /**
   * Асинхронное удаление файлов фотографии из S3
   */
  private async deletePhotoFilesAsync(photo: Photo): Promise<void> {
    const keysToDelete: string[] = [];

    if (photo.s3KeyOriginal) {
      keysToDelete.push(photo.s3KeyOriginal);
    }

    if (photo.s3KeyVariants) {
      const variants = photo.s3KeyVariants as PhotoVariants;
      Object.values(variants).forEach(formatVariants => {
        if (formatVariants && typeof formatVariants === 'object') {
          Object.values(formatVariants).forEach(key => {
            if (key && typeof key === 'string') keysToDelete.push(key);
          });
        }
      });
    }

    if (keysToDelete.length > 0) {
      try {
        await this.s3Service.deleteObjects(keysToDelete);
      } catch (error) {
        this.logger.error(`Failed to delete S3 files for photo ${photo.id}:`, error);
      }
    }
  }

  /**
   * Асинхронное удаление файлов множественных фотографий из S3
   */
  private async deleteMultiplePhotosFilesAsync(photos: Photo[]): Promise<void> {
    const keysToDelete: string[] = [];

    photos.forEach(photo => {
      if (photo.s3KeyOriginal) {
        keysToDelete.push(photo.s3KeyOriginal);
      }

      if (photo.s3KeyVariants) {
        const variants = photo.s3KeyVariants as PhotoVariants;
        Object.values(variants).forEach(formatVariants => {
          if (formatVariants && typeof formatVariants === 'object') {
            Object.values(formatVariants).forEach(key => {
              if (key && typeof key === 'string') keysToDelete.push(key);
            });
          }
        });
      }
    });

    if (keysToDelete.length > 0) {
      try {
        await this.s3Service.deleteObjects(keysToDelete);
      } catch (error) {
        this.logger.error('Failed to delete S3 files for multiple photos:', error);
      }
    }
  }

  /**
   * Преобразует модель Photo в DTO
   */
  private mapPhotoToDto(photo: Photo): PhotoResponseDto {
    return {
      id: photo.id,
      status: photo.status,
      isCover: photo.isCover,
      sortOrder: photo.sortOrder,
      mime: photo.mime,
      width: photo.width,
      height: photo.height,
      variants: photo.s3KeyVariants as PhotoVariants | null,
      cdnBaseUrl: this.cdnBaseUrl,
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt,
    };
  }
}
