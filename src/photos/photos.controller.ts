import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiCookieAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PhotosService } from './photos.service';
import { RequestWithUser } from '../auth/types/auth.types';
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

@ApiTags('Photos')
@Controller('listings/:listingId/photos')
@UseGuards(AuthGuard)
@ApiCookieAuth('sid')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('uploads')
  @ApiOperation({ summary: 'Создать слоты для загрузки фотографий' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiResponse({
    status: 200,
    description: 'Слоты успешно созданы',
    type: CreateUploadSlotsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Неверные параметры или превышен лимит фотографий',
    example: {
      error: {
        code: 'BAD_REQUEST',
        message: 'Превышен лимит фотографий',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
    example: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Отсутствует сессия',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Нет доступа к объявлению',
    example: {
      error: {
        code: 'FORBIDDEN',
        message: 'Доступ запрещен',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Объявление не найдено',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Объявление не найдено',
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Превышен лимит запросов',
    example: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Превышен лимит запросов',
      },
    },
  })
  async createUploadSlots(
    @Param('listingId') listingId: string,
    @Body() createUploadSlotsDto: CreateUploadSlotsDto,
    @Req() req: RequestWithUser,
  ): Promise<CreateUploadSlotsResponseDto> {
    return this.photosService.createUploadSlots(
      listingId,
      req.user.id,
      createUploadSlotsDto,
    );
  }

  @Post('complete')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Подтвердить завершение загрузки фотографии' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiResponse({
    status: 202,
    description: 'Загрузка подтверждена, фотография поставлена в очередь обработки',
    type: CompleteUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Неверные параметры или файл не найден',
    example: {
      error: {
        code: 'BAD_REQUEST',
        message: 'Файл не найден в S3',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  @ApiNotFoundResponse({
    description: 'Фотография или объявление не найдены',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Фотография не найдена',
      },
    },
  })
  async completeUpload(
    @Param('listingId') listingId: string,
    @Body() completeUploadDto: CompleteUploadDto,
    @Req() req: RequestWithUser,
  ): Promise<CompleteUploadResponseDto> {
    return this.photosService.completeUpload(
      listingId,
      req.user.id,
      completeUploadDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Получить список фотографий объявления' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiResponse({
    status: 200,
    description: 'Список фотографий',
    type: [PhotoResponseDto],
  })
  @ApiNotFoundResponse({
    description: 'Объявление не найдено',
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  async getPhotos(
    @Param('listingId') listingId: string,
  ): Promise<PhotoResponseDto[]> {
    return this.photosService.getPhotosByListing(listingId);
  }

  @Patch(':photoId')
  @ApiOperation({ summary: 'Установить/снять обложку объявления' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiParam({ name: 'photoId', description: 'ID фотографии' })
  @ApiResponse({
    status: 200,
    description: 'Обложка успешно обновлена',
    type: PhotoOperationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Фотография еще не готова',
    example: {
      error: {
        code: 'BAD_REQUEST',
        message: 'Фотография еще не готова',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  @ApiNotFoundResponse({
    description: 'Фотография не найдена',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Фотография не найдена',
      },
    },
  })
  async updatePhotoCover(
    @Param('listingId') listingId: string,
    @Param('photoId') photoId: string,
    @Body() updatePhotoCoverDto: UpdatePhotoCoverDto,
  ): Promise<PhotoOperationResponseDto> {
    return this.photosService.updatePhotoCover(listingId, photoId, updatePhotoCoverDto);
  }

  @Patch('order')
  @ApiOperation({ summary: 'Изменить порядок фотографий' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiResponse({
    status: 200,
    description: 'Порядок фотографий успешно обновлен',
    type: PhotoOperationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некоторые фотографии не найдены',
    example: {
      error: {
        code: 'BAD_REQUEST',
        message: 'Некоторые фотографии не найдены',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  async updatePhotoOrder(
    @Param('listingId') listingId: string,
    @Body() updatePhotoOrderDto: UpdatePhotoOrderDto,
  ): Promise<PhotoOperationResponseDto> {
    return this.photosService.updatePhotoOrder(listingId, updatePhotoOrderDto);
  }

  @Delete(':photoId')
  @ApiOperation({ summary: 'Удалить фотографию' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiParam({ name: 'photoId', description: 'ID фотографии' })
  @ApiResponse({
    status: 200,
    description: 'Фотография успешно удалена',
    type: DeletePhotoResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  @ApiNotFoundResponse({
    description: 'Фотография не найдена',
    example: {
      error: {
        code: 'NOT_FOUND',
        message: 'Фотография не найдена',
      },
    },
  })
  async deletePhoto(
    @Param('listingId') listingId: string,
    @Param('photoId') photoId: string,
  ): Promise<DeletePhotoResponseDto> {
    return this.photosService.deletePhoto(listingId, photoId);
  }

  @Delete()
  @ApiOperation({ summary: 'Удалить все фотографии объявления' })
  @ApiParam({ name: 'listingId', description: 'ID объявления' })
  @ApiResponse({
    status: 200,
    description: 'Все фотографии успешно удалены',
    type: DeleteAllPhotosResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Нет доступа',
  })
  async deleteAllPhotos(
    @Param('listingId') listingId: string,
  ): Promise<DeleteAllPhotosResponseDto> {
    return this.photosService.deleteAllPhotos(listingId);
  }
}
