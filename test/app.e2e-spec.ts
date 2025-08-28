import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AI Realtor Backend (e2e)', () => {
  let app: INestApplication;
  let createdListingId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as in main.ts
    app.setGlobalPrefix('/api/v1', {
      exclude: ['health'],
    });
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('uptimeSec');
          expect(res.body).toHaveProperty('timestamp');
          expect(typeof res.body.uptimeSec).toBe('number');
          expect(typeof res.body.timestamp).toBe('string');
        });
    });
  });

  describe('/api/v1/config (GET)', () => {
    it('should return application config', () => {
      return request(app.getHttpServer())
        .get('/api/v1/config')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('env');
          expect(res.body).toHaveProperty('limits');
          expect(res.body).toHaveProperty('features');
          expect(res.body.limits).toHaveProperty('maxUploadMb');
          expect(res.body.features).toHaveProperty('listings');
        });
    });
  });

  describe('/api/v1/listings (POST)', () => {
    it('should create a new listing', () => {
      const createListingDto = {
        type: 'sale',
        title: 'Test Bilocale luminoso',
        price: 199000,
        userFields: {
          city: 'Milano',
          floor: 2,
          balcony: true,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/listings')
        .send(createListingDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('type', 'sale');
          expect(res.body).toHaveProperty('status', 'draft');
          expect(res.body).toHaveProperty('title', createListingDto.title);
          expect(res.body).toHaveProperty('price', createListingDto.price);
          expect(res.body).toHaveProperty('userFields');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          
          createdListingId = res.body.id;
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toHaveProperty('code');
        });
    });
  });

  describe('/api/v1/listings (GET)', () => {
    it('should return listings with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/listings')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('should support filtering and search', () => {
      return request(app.getHttpServer())
        .get('/api/v1/listings?status=draft&type=sale&q=Bilo&page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });
  });

  describe('/api/v1/listings/:id (GET)', () => {
    it('should return a listing by ID', async () => {
      // First create a listing
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          type: 'rent',
          title: 'Test Listing for GET',
          price: 1500,
        })
        .expect(201);

      const listingId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/listings/${listingId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', listingId);
          expect(res.body).toHaveProperty('type', 'rent');
          expect(res.body).toHaveProperty('title', 'Test Listing for GET');
        });
    });

    it('should return 404 for non-existent listing', () => {
      return request(app.getHttpServer())
        .get('/api/v1/listings/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('/api/v1/listings/:id (PATCH)', () => {
    it('should update a listing and merge userFields', async () => {
      // First create a listing
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          type: 'sale',
          title: 'Original Title',
          price: 200000,
          userFields: {
            city: 'Milano',
            balcony: true,
          },
        })
        .expect(201);

      const listingId = createResponse.body.id;

      const updateDto = {
        price: 205000,
        userFields: {
          balcony: false,
          notes: 'cortile tranquillo',
        },
      };

      return request(app.getHttpServer())
        .patch(`/api/v1/listings/${listingId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', listingId);
          expect(res.body).toHaveProperty('price', 205000);
          expect(res.body.userFields).toHaveProperty('city', 'Milano'); // preserved
          expect(res.body.userFields).toHaveProperty('balcony', false); // updated
          expect(res.body.userFields).toHaveProperty('notes', 'cortile tranquillo'); // added
        });
    });
  });

  describe('/api/v1/listings/:id (DELETE)', () => {
    it('should soft delete a listing', async () => {
      // First create a listing
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/listings')
        .send({
          type: 'sale',
          title: 'Listing to Delete',
          price: 150000,
        })
        .expect(201);

      const listingId = createResponse.body.id;

      // Delete the listing
      await request(app.getHttpServer())
        .delete(`/api/v1/listings/${listingId}`)
        .expect(204);

      // Try to get the deleted listing - should return 404
      return request(app.getHttpServer())
        .get(`/api/v1/listings/${listingId}`)
        .expect(404);
    });
  });
});
