import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '../redis.service';
import { LoggerService } from '@common';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRedisClient = {
      pipeline: jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      }),
      zremrangebyscore: jest.fn(),
      zcard: jest.fn(),
      del: jest.fn(),
    };

    redisService = {
      client: mockRedisClient as any,
    } as any;

    configService = {
      get: jest.fn().mockReturnValue({
        rateLimit: {
          defaults: {
            test: { requests: 100, window: 3600 },
            live: { requests: 10000, window: 3600 },
          },
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
        RateLimitService,
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

    service = module.get<RateLimitService>(RateLimitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRateLimit', () => {
    it('should allow request within limit', async () => {
      const pipeline = redisService.client.pipeline();
      (pipeline.exec as jest.Mock).mockResolvedValue([
        [null, 1], // zremrangebyscore
        [null, 1], // zadd
        [null, 1], // expire
        [null, 5], // zcard - 5 requests
      ]);

      const result = await service.checkRateLimit('test-id', 'test');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
    });

    it('should reject request exceeding limit', async () => {
      const pipeline = redisService.client.pipeline();
      (pipeline.exec as jest.Mock).mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
        [null, 101], // zcard - 101 requests (exceeds limit of 100)
      ]);

      const result = await service.checkRateLimit('test-id', 'test');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow request on Redis failure (graceful degradation)', async () => {
      const pipeline = redisService.client.pipeline();
      (pipeline.exec as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.checkRateLimit('test-id', 'test');
      expect(result.allowed).toBe(true);
      expect(result.fallback).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
