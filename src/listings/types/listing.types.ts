export enum ListingType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum ListingStatus {
  DRAFT = 'draft',
  READY = 'ready',
  ARCHIVED = 'archived',
}

export enum ListingSortOrder {
  CREATED_AT_ASC = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
  PRICE_ASC = 'price',
  PRICE_DESC = '-price',
}
