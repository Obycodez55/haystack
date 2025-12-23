import { INestApplication } from '@nestjs/common';
import { RequestHelper, DatabaseHelper } from './helpers';
import { TenantHelper } from './helpers/tenant.helper';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await RequestHelper.createTestApp();
    await DatabaseHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await app.close();
    await DatabaseHelper.teardownTestDatabase();
  });

  it('/ (GET) should return API status', async () => {
    const response = await RequestHelper.makeRequest(app, 'get', '/', {
      expectedStatus: 200,
    });

    RequestHelper.expectSuccessResponse(response);
    expect(response.body.data).toBeDefined();
  });

  it('/api/v1 (GET) should return API status with version', async () => {
    const response = await RequestHelper.makeRequest(app, 'get', '/api/v1', {
      expectedStatus: 200,
    });

    RequestHelper.expectSuccessResponse(response);
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await RequestHelper.makeRequest(
      app,
      'get',
      '/unknown-route',
      {
        expectedStatus: 404,
      },
    );

    RequestHelper.expectErrorResponse(response);
  });
});
