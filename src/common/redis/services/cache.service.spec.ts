import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisService } from '../redis.service';
import { LoggerService } from '../../logging/services/logger.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      smembers: jest.fn(),
      sadd: jest.fn(),
      expire: jest.fn(),
    };

    redisService = {
      client: mockRedisClient as any,
    } as any;

    configService = {
      get: jest.fn().mockReturnValue({
        defaultTtl: 3600,
        cacheTtl: {
          payment: 300,
          provider: 60,
          tenant: 900,
        },
      }),
    } as any;

    logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const cachedValue = { id: '1', name: 'Test' };
      (redisService.client.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedValue),
      );

      const result = await service.get('test-key', 'test-namespace');

      expect(result).toEqual(cachedValue);
      expect(redisService.client.get).toHaveBeenCalled();
    });

    it('should return null if not cached', async () => {
      (redisService.client.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null on error (graceful degradation)', async () => {
      (redisService.client.get as jest.Mock).mockRejectedValue(
        new Error('Redis error'),
      );

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const value = { id: '1', name: 'Test' };
      (redisService.client.setex as jest.Mock).mockResolvedValue('OK');

      const result = await service.set('test-key', value, { ttl: 300 });

      expect(result).toBe(true);
      expect(redisService.client.setex).toHaveBeenCalled();
    });

    it('should set value without TTL', async () => {
      const value = { id: '1' };
      (redisService.client.set as jest.Mock).mockResolvedValue('OK');

      const result = await service.set('test-key', value, { ttl: 0 });

      expect(result).toBe(true);
      // When ttl is 0, it should use set() instead of setex()
      // The key will be prefixed with namespace if provided, or just the key
      expect(redisService.client.set).toHaveBeenCalled();
      expect(redisService.client.setex).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { id: '1' };
      (redisService.client.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedValue),
      );

      const fetcher = jest.fn();

      const result = await service.getOrSet('test-key', fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not cached', async () => {
      (redisService.client.get as jest.Mock).mockResolvedValue(null);
      (redisService.client.setex as jest.Mock).mockResolvedValue('OK');

      const fetchedValue = { id: '1', name: 'Fetched' };
      const fetcher = jest.fn().mockResolvedValue(fetchedValue);

      const result = await service.getOrSet('test-key', fetcher);
      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalled();
      expect(redisService.client.setex).toHaveBeenCalled();
    });
  });
});
