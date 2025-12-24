import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { TenantScopedEntity } from '../entities/base.entity';
import { LoggerService } from '@common';

class TestEntity extends TenantScopedEntity {
  name: string;
}

describe('BaseRepository', () => {
  let repository: BaseRepository<TestEntity>;
  let mockRepository: jest.Mocked<Repository<TestEntity>>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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
        {
          provide: getRepositoryToken(TestEntity),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
        {
          provide: BaseRepository,
          useFactory: (repo: Repository<TestEntity>, log: LoggerService) => {
            return new (class extends BaseRepository<TestEntity> {
              constructor() {
                super(repo, log);
              }
            })();
          },
          inject: [getRepositoryToken(TestEntity), LoggerService],
        },
      ],
    }).compile();

    repository = module.get<BaseRepository<TestEntity>>(BaseRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find entity by id and tenant', async () => {
      const entity = {
        id: '1',
        tenantId: 'tenant1',
        name: 'Test',
      } as TestEntity;
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById('1', 'tenant1');

      expect(result).toEqual(entity);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 'tenant1' },
      });
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('1', 'tenant1');
      expect(result).toBeNull();
    });
  });
});
