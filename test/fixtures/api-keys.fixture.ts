import {
  ApiKeyEntity,
  ApiKeyMode,
} from '@modules/auth/entities/api-key.entity';

/**
 * Static API key fixtures for testing
 * Use these for consistent test data that doesn't need randomization
 */
export const apiKeyFixtures = {
  /**
   * Active test mode API key
   */
  activeTestKey: (tenantId: string): Partial<ApiKeyEntity> => ({
    tenantId,
    keyHash: 'hashed_key_here',
    keyPrefix: 'sk_test_',
    name: 'Test API Key',
    mode: ApiKeyMode.TEST,
    isActive: true,
  }),

  /**
   * Active live mode API key
   */
  activeLiveKey: (tenantId: string): Partial<ApiKeyEntity> => ({
    tenantId,
    keyHash: 'hashed_key_here',
    keyPrefix: 'sk_live_',
    name: 'Live API Key',
    mode: ApiKeyMode.LIVE,
    isActive: true,
  }),

  /**
   * Revoked API key
   */
  revokedKey: (tenantId: string): Partial<ApiKeyEntity> => ({
    tenantId,
    keyHash: 'hashed_key_here',
    keyPrefix: 'sk_test_',
    name: 'Revoked API Key',
    mode: ApiKeyMode.TEST,
    isActive: false,
    revokedAt: new Date(),
    revokedReason: 'Security breach',
  }),

  /**
   * Expired API key
   */
  expiredKey: (tenantId: string): Partial<ApiKeyEntity> => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);

    return {
      tenantId,
      keyHash: 'hashed_key_here',
      keyPrefix: 'sk_test_',
      name: 'Expired API Key',
      mode: ApiKeyMode.TEST,
      isActive: true,
      expiresAt: expiredDate,
    };
  },
};
