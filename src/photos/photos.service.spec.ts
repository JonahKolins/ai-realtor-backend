import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PhotosService } from './photos.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { ImageProcessingService } from './services/image-processing.service';
import { PhotoStatus } from '@prisma/client';
import { AllowedMimeType } from './types/photo.types';

describe('PhotosService', () => {
  let service: PhotosService;
  let prismaService: PrismaService;
  let s3Service: S3Service;
  let imageProcessingService: ImageProcessingService;

  const mockPrismaService = {
    listing: {
      findUnique: jest.fn(),
    },
    photo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockS3Service = {
    generateUploadSlots: jest.fn(),
    objectExists: jest.fn(),
    deleteObjects: jest.fn(),
    getObject: jest.fn(),
    uploadObject: jest.fn(),
  };

  const mockImageProcessingService = {
    validateImage: jest.fn(),
    processImage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'CDN_BASE_URL': 'https://media.casalabia.dev',
        'MEDIA_MAX_FILES_PER_LISTING': 30,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: ImageProcessingService,
          useValue: mockImageProcessingService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    prismaService = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    imageProcessingService = module.get<ImageProcessingService>(ImageProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUploadSlots', () => {
    const listingId = 'listing-1';
    const userId = 'user-1';
    const createDto = { count: 2, mimeTypes: ['image/jpeg', 'image/png'] as AllowedMimeType[] };

    it('should create upload slots successfully', async () => {
      // Arrange
      const mockListing = {
        id: listingId,
        _count: { photoEntries: 5 },
      };

      const mockSlots = [
        {
          assetId: '550e8400-e29b-41d4-a716-446655440001',
          key: 'uploads/users/user-1/listings/listing-1/550e8400-e29b-41d4-a716-446655440001/orig.jpg',
          uploadUrl: 'https://s3.amazonaws.com/upload-url-1',
        },
        {
          assetId: '550e8400-e29b-41d4-a716-446655440002',
          key: 'uploads/users/user-1/listings/listing-1/550e8400-e29b-41d4-a716-446655440002/orig.png',
          uploadUrl: 'https://s3.amazonaws.com/upload-url-2',
        },
      ];

      mockPrismaService.listing.findUnique.mockResolvedValue(mockListing);
      mockS3Service.generateUploadSlots.mockResolvedValue({
        slots: mockSlots,
        expiresInSeconds: 300,
      });
      mockPrismaService.photo.create.mockResolvedValue({});

      // Act
      const result = await service.createUploadSlots(listingId, userId, createDto);

      // Assert
      expect(result).toEqual({
        items: mockSlots,
        expiresInSeconds: 300,
      });

      expect(prismaService.listing.findUnique).toHaveBeenCalledWith({
        where: { id: listingId },
        include: { _count: { select: { photoEntries: true } } },
      });

      expect(s3Service.generateUploadSlots).toHaveBeenCalledWith(
        userId,
        listingId,
        createDto.count,
        createDto.mimeTypes
      );

      expect(prismaService.photo.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error if listing not found', async () => {
      // Arrange
      mockPrismaService.listing.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createUploadSlots(listingId, userId, createDto))
        .rejects
        .toThrow('Объявление не найдено');
    });

    it('should throw error if photo limit exceeded', async () => {
      // Arrange
      const mockListing = {
        id: listingId,
        _count: { photoEntries: 29 }, // уже 29 фотографий
      };

      mockPrismaService.listing.findUnique.mockResolvedValue(mockListing);

      const dto = { count: 5 }; // пытаемся добавить еще 5

      // Act & Assert
      await expect(service.createUploadSlots(listingId, userId, dto))
        .rejects
        .toThrow(/Превышен лимит фотографий/);
    });
  });

  describe('getPhotosByListing', () => {
    it('should return photos for listing', async () => {
      // Arrange
      const listingId = 'listing-1';
      const mockPhotos = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          listingId,
          status: PhotoStatus.READY,
          isCover: true,
          sortOrder: 0,
          mime: 'image/webp',
          width: 1600,
          height: 1067,
          s3KeyVariants: {
            webp: {
              w1600: 'processed/users/user-1/listings/listing-1/550e8400-e29b-41d4-a716-446655440001/w1600.webp',
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.photo.findMany.mockResolvedValue(mockPhotos);

      // Act
      const result = await service.getPhotosByListing(listingId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: PhotoStatus.READY,
        isCover: true,
        sortOrder: 0,
        cdnBaseUrl: 'https://media.casalabia.dev',
      });

      expect(prismaService.photo.findMany).toHaveBeenCalledWith({
        where: { listingId },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });
    });
  });

  describe('updatePhotoOrder', () => {
    it('should update photo order successfully', async () => {
      // Arrange
      const listingId = 'listing-1';
      const dto = { ids: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'] };
      
      mockPrismaService.photo.findMany.mockResolvedValue([
        { id: '550e8400-e29b-41d4-a716-446655440001', listingId },
        { id: '550e8400-e29b-41d4-a716-446655440002', listingId },
        { id: '550e8400-e29b-41d4-a716-446655440003', listingId },
      ]);
      mockPrismaService.photo.update.mockResolvedValue({});

      // Act
      const result = await service.updatePhotoOrder(listingId, dto);

      // Assert
      expect(result).toEqual({ ok: true });
      expect(prismaService.photo.update).toHaveBeenCalledTimes(3);
    });

    it('should throw error if some photos not found', async () => {
      // Arrange
      const listingId = 'listing-1';
      const dto = { ids: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'] };
      
      mockPrismaService.photo.findMany.mockResolvedValue([
        { id: '550e8400-e29b-41d4-a716-446655440001', listingId },
        // 550e8400-e29b-41d4-a716-446655440002 отсутствует
      ]);

      // Act & Assert
      await expect(service.updatePhotoOrder(listingId, dto))
        .rejects
        .toThrow('Некоторые фотографии не найдены');
    });
  });
});
