import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsDto, ListingResponseDto, ListListingsResponseDto } from './dto/list-listings.dto';
import { ListingType, ListingStatus, ListingSortOrder } from './types/listing.types';

// Собственные энумы для типобезопасности
export enum PrismaListingType {
  SALE = 'SALE',
  RENT = 'RENT',
}

export enum PrismaListingStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ARCHIVED = 'ARCHIVED',
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createListingDto: CreateListingDto): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.create({
      data: {
        type: this.mapTypeToEnum(createListingDto.type),
        propertyType: createListingDto.propertyType || 'default',
        title: createListingDto.title,
        price: createListingDto.price,
        userFields: createListingDto.userFields,
        status: PrismaListingStatus.DRAFT,
      },
    });

    return this.mapToResponse(listing);
  }

  async findMany(query: ListListingsDto): Promise<ListListingsResponseDto> {
    const { page, limit, status, type, propertyType, q, sort } = query;
    const skip = (page - 1) * limit;

    // Построение фильтров
    const where: any = {
      deletedAt: null, // Исключаем мягко удалённые
    };

    if (status) {
      where.status = this.mapStatusToEnum(status);
    }

    if (type) {
      where.type = this.mapTypeToEnum(type);
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (q) {
      where.title = {
        contains: q,
        mode: 'insensitive',
      };
    }

    // Построение сортировки
    const orderBy = this.buildOrderBy(sort);

    // Получение данных и подсчёт общего количества
    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: listings.map(listing => this.mapToResponse(listing)),
      page,
      limit,
      total,
    };
  }

  async findById(id: string): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.mapToResponse(listing);
  }

  async getByIdForOwner(id: string, userId?: string): Promise<any> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id,
        deletedAt: null,
        // В будущем можно добавить проверку владельца
        // ...(userId && { ownerId: userId }),
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Возвращаем полные данные для AI (включая все поля)
    return {
      id: listing.id,
      type: listing.type,
      propertyType: listing.propertyType,
      status: listing.status,
      title: listing.title,
      price: listing.price ? Number(listing.price) : null,
      userFields: listing.userFields as Record<string, any> | null,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }

  async update(id: string, updateListingDto: UpdateListingDto): Promise<ListingResponseDto> {
    // Сначала получим существующий листинг
    const existingListing = await this.prisma.listing.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingListing) {
      throw new NotFoundException('Listing not found');
    }

    // Мерджим userFields с существующими
    let mergedUserFields = existingListing.userFields;
    if (updateListingDto.userFields) {
      mergedUserFields = {
        ...(existingListing.userFields as any || {}),
        ...updateListingDto.userFields,
      };
    }

    const updateData: any = {};

    if (updateListingDto.type) {
      updateData.type = this.mapTypeToEnum(updateListingDto.type);
    }

    if (updateListingDto.propertyType !== undefined) {
      updateData.propertyType = updateListingDto.propertyType;
    }

    if (updateListingDto.status) {
      updateData.status = this.mapStatusToEnum(updateListingDto.status);
    }

    if (updateListingDto.title !== undefined) {
      updateData.title = updateListingDto.title;
    }

    if (updateListingDto.price !== undefined) {
      updateData.price = updateListingDto.price;
    }

    if (updateListingDto.userFields) {
      updateData.userFields = mergedUserFields;
    }

    const listing = await this.prisma.listing.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponse(listing);
  }

  async softDelete(id: string): Promise<void> {
    const existingListing = await this.prisma.listing.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingListing) {
      throw new NotFoundException('Listing not found');
    }

    await this.prisma.listing.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: PrismaListingStatus.ARCHIVED,
      },
    });
  }

  private mapToResponse(listing: any): ListingResponseDto {
    return {
      id: listing.id,
      type: this.mapTypeFromEnum(listing.type),
      propertyType: listing.propertyType,
      status: this.mapStatusFromEnum(listing.status),
      title: listing.title,
      price: listing.price ? Number(listing.price) : null,
      userFields: listing.userFields as Record<string, any> | null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };
  }

  private mapTypeToEnum(type: ListingType): PrismaListingType {
    return type === ListingType.SALE ? PrismaListingType.SALE : PrismaListingType.RENT;
  }

  private mapTypeFromEnum(type: string): ListingType {
    return type === PrismaListingType.SALE ? ListingType.SALE : ListingType.RENT;
  }

  private mapStatusToEnum(status: ListingStatus): PrismaListingStatus {
    switch (status) {
      case ListingStatus.DRAFT:
        return PrismaListingStatus.DRAFT;
      case ListingStatus.READY:
        return PrismaListingStatus.READY;
      case ListingStatus.ARCHIVED:
        return PrismaListingStatus.ARCHIVED;
      default:
        return PrismaListingStatus.DRAFT;
    }
  }

  private mapStatusFromEnum(status: string): ListingStatus {
    switch (status) {
      case PrismaListingStatus.DRAFT:
        return ListingStatus.DRAFT;
      case PrismaListingStatus.READY:
        return ListingStatus.READY;
      case PrismaListingStatus.ARCHIVED:
        return ListingStatus.ARCHIVED;
      default:
        return ListingStatus.DRAFT;
    }
  }

  private buildOrderBy(sort: ListingSortOrder): any {
    switch (sort) {
      case ListingSortOrder.CREATED_AT_ASC:
        return { createdAt: 'asc' };
      case ListingSortOrder.CREATED_AT_DESC:
        return { createdAt: 'desc' };
      case ListingSortOrder.PRICE_ASC:
        return { price: 'asc' };
      case ListingSortOrder.PRICE_DESC:
        return { price: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}
