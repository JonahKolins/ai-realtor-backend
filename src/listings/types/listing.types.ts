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
