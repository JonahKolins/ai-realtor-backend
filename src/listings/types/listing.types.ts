export enum ListingType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum ListingStatus {
  DRAFT = 'draft',
  READY = 'ready',
  ARCHIVED = 'archived',
}

// Константы для типов недвижимости (для валидации)
export const PROPERTY_TYPES = [
  'default',
  'house',
  'apartment', 
  'room',
  'cellar',
  'garage',
  'parking',
  'commercial'
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];

export enum ListingSortOrder {
  CREATED_AT_ASC = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
  PRICE_ASC = 'price',
  PRICE_DESC = '-price',
}

// Интерфейс для пользовательских полей объявления
export interface IListingUserFields {
  [key: string]: any;
}

// Интерфейс для черновика объявления
export interface IListingDraftData {
  // ID для AI генерации
  id?: string;
  // Основные данные
  type?: ListingType;
  propertyType?: PropertyType;
  // Основные данные для AI генерации
  title?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  metaDescription?: string;
  // Цена
  price?: number;
  // Пользовательские поля - V2.0 для AI mustCover системы
  userFields?: IListingUserFields;
  // Медиа файлы
  photos?: string[];
  documents?: string[];
}

// Интерфейс для полного объявления
export interface IListingData {
  // ID объявления
  id: string;
  // Основные данные
  type: ListingType;
  propertyType: PropertyType;
  status: ListingStatus;
  // Основные данные для AI генерации
  title?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  metaDescription?: string;
  // Цена
  price?: number;
  // Пользовательские поля - V2.0 для AI mustCover системы
  userFields?: IListingUserFields;
  // Медиа файлы
  photos?: string[];
  documents?: string[];
  // Временные метки
  createdAt: string;
  updatedAt: string;
}
