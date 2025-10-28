import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ImageProcessingService } from './image-processing.service';

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        'IMAGE_QUALITY_WEBP': '85',
        'IMAGE_QUALITY_AVIF': '75',
        'MEDIA_MAX_FILE_SIZE_MB': '20',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProcessingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load configuration correctly', () => {
    const config = service.getProcessingConfig();
    
    expect(config.quality.webp).toBe(85); // должно быть числом, не строкой
    expect(config.quality.avif).toBe(75); // должно быть числом, не строкой
    expect(typeof config.quality.webp).toBe('number');
    expect(typeof config.quality.avif).toBe('number');
  });

  it('should validate config calls', () => {
    expect(mockConfigService.get).toHaveBeenCalledWith('IMAGE_QUALITY_WEBP', '85');
    expect(mockConfigService.get).toHaveBeenCalledWith('IMAGE_QUALITY_AVIF', '75');
    expect(mockConfigService.get).toHaveBeenCalledWith('MEDIA_MAX_FILE_SIZE_MB', '20');
  });
});
