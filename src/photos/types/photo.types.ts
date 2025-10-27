import { PhotoStatus } from '@prisma/client';

export interface PhotoVariants {
  [format: string]: {
    [size: string]: string;
  };
  webp?: {
    w1600?: string;
    w1024?: string;
    w512?: string;
  };
  avif?: {
    w1600?: string;
    w1024?: string; 
    w512?: string;
  };
}

export interface UploadSlot {
  assetId: string;
  key: string;
  uploadUrl: string;
}

export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  mime: string;
  originalName?: string;
}

export interface ProcessedImageVariant {
  key: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface ImageProcessingResult {
  variants: ProcessedImageVariant[];
  success: boolean;
  error?: string;
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic'
] as const;

export const IMAGE_SIZES = {
  w1600: { width: 1600 },
  w1024: { width: 1024 },
  w512: { width: 512 }
} as const;

export const OUTPUT_FORMATS = ['webp', 'avif'] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
export type ImageSize = keyof typeof IMAGE_SIZES;
export type OutputFormat = typeof OUTPUT_FORMATS[number];

// Конфигурация обработки изображений
export interface ImageProcessingConfig {
  quality: {
    webp: number;
    avif: number;
  };
  sizes: ImageSize[];
  formats: OutputFormat[];
  maxFileSize: number; // в байтах
  maxDimension: number; // максимальная сторона
  minDimension: number; // минимальная сторона
}

export interface S3KeyPaths {
  uploads: string;
  processed: string;
  public: string;
}

// Типы для валидации
export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  normalizedMime?: string;
}

// Интерфейс для CDN URL
export interface CdnUrls {
  variants: PhotoVariants;
  cdnBaseUrl: string;
}
