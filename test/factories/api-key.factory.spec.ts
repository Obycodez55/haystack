import { ApiKeyFactory } from './api-key.factory';
import {
  ApiKeyEntity,
  ApiKeyMode,
} from '@modules/auth/entities/api-key.entity';
import { TenantFactory } from './tenant.factory';
import { DatabaseHelper } from '../helpers/database.helper';

describe('ApiKeyFactory', () => {
  let tenantId: string;

  beforeAll(async () => {
    await DatabaseHelper.setupTestDatabase();
    const dataSource = DatabaseHelper.getTestDataSource();
    TenantFactory.setDataSource(dataSource);
    ApiKeyFactory.setDataSource(dataSource);

    // Create a tenant for API keys
    const tenant = await TenantFactory.create();
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await DatabaseHelper.teardownTestDatabase();
  });

  describe('build', () => {
    it('should build an API key entity without saving', async () => {
      const apiKey = await ApiKeyFactory.build(tenantId);

      expect(apiKey).toBeInstanceOf(ApiKeyEntity);
      expect(apiKey.tenantId).toBe(tenantId);
      expect(apiKey.keyHash).toBeDefined();
      expect(apiKey.keyPrefix).toBeDefined();
      expect(apiKey.mode).toBe(ApiKeyMode.TEST);
      expect(apiKey.isActive).toBe(true);
    });

    it('should allow overriding properties', async () => {
      const apiKey = await ApiKeyFactory.build(tenantId, {
        mode: ApiKeyMode.LIVE,
        name: 'Custom Key',
        isActive: false,
      });

      expect(apiKey.mode).toBe(ApiKeyMode.LIVE);
      expect(apiKey.name).toBe('Custom Key');
      expect(apiKey.isActive).toBe(false);
    });
  });

  describe('create', () => {
    it('should create and save an API key', async () => {
      const apiKey = await ApiKeyFactory.create(tenantId, {
        name: 'Test API Key',
      });

      expect(apiKey.id).toBeDefined();
      expect(apiKey.tenantId).toBe(tenantId);
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('createWithValidKey', () => {
    it('should create API key with valid plaintext key', async () => {
      const { entity, plaintextKey } =
        await ApiKeyFactory.createWithValidKey(tenantId);

      expect(entity.id).toBeDefined();
      expect(plaintextKey).toBeDefined();
      expect(plaintextKey).toMatch(/^sk_(test|live)_/);
    });
  });

  describe('createTest', () => {
    it('should create a test mode API key', async () => {
      const apiKey = await ApiKeyFactory.createTest(tenantId);

      expect(apiKey.mode).toBe(ApiKeyMode.TEST);
    });
  });

  describe('createLive', () => {
    it('should create a live mode API key', async () => {
      const apiKey = await ApiKeyFactory.createLive(tenantId);

      expect(apiKey.mode).toBe(ApiKeyMode.LIVE);
    });
  });
});
