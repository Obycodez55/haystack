import { TemplateRegistry } from './template.registry';
import {
  EmailVerificationVariables,
  PasswordResetVariables,
  TeamInvitationVariables,
  WelcomeVariables,
  TwoFactorSetupVariables,
} from '../interfaces/template-variables.interface';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('get', () => {
    it('should return template metadata for email-verification', () => {
      const template = registry.get('email-verification');

      expect(template).toBeDefined();
      expect(template?.name).toBe('email-verification');
      expect(template?.file).toBe('email-verification.hbs');
      expect(template?.category).toBe('auth');
    });

    it('should return template metadata for password-reset', () => {
      const template = registry.get('password-reset');

      expect(template).toBeDefined();
      expect(template?.name).toBe('password-reset');
      expect(template?.category).toBe('auth');
    });

    it('should return template metadata for team-invitation', () => {
      const template = registry.get('team-invitation');

      expect(template).toBeDefined();
      expect(template?.name).toBe('team-invitation');
      expect(template?.category).toBe('team');
    });

    it('should return template metadata for welcome', () => {
      const template = registry.get('welcome');

      expect(template).toBeDefined();
      expect(template?.name).toBe('welcome');
      expect(template?.category).toBe('system');
    });

    it('should return template metadata for two-factor-setup', () => {
      const template = registry.get('two-factor-setup');

      expect(template).toBeDefined();
      expect(template?.name).toBe('two-factor-setup');
      expect(template?.category).toBe('auth');
    });

    it('should return undefined for non-existent template', () => {
      const template = registry.get('non-existent' as any);

      expect(template).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing template', () => {
      expect(registry.has('email-verification')).toBe(true);
      expect(registry.has('password-reset')).toBe(true);
      expect(registry.has('welcome')).toBe(true);
    });

    it('should return false for non-existent template', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered templates', () => {
      const templates = registry.getAll();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.name === 'email-verification')).toBe(true);
      expect(templates.some((t) => t.name === 'password-reset')).toBe(true);
    });
  });

  describe('validateVariables', () => {
    it('should validate email-verification variables', () => {
      const validVariables: EmailVerificationVariables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      expect(
        registry.validateVariables('email-verification', validVariables),
      ).toBe(true);
    });

    it('should reject invalid email-verification variables', () => {
      const invalidVariables = {
        userName: 'John Doe',
        // Missing required fields
      };

      expect(
        registry.validateVariables('email-verification', invalidVariables),
      ).toBe(false);
    });

    it('should validate password-reset variables', () => {
      const validVariables: PasswordResetVariables = {
        userName: 'John Doe',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
        supportEmail: 'support@haystack.com',
      };

      expect(registry.validateVariables('password-reset', validVariables)).toBe(
        true,
      );
    });

    it('should validate team-invitation variables', () => {
      const validVariables: TeamInvitationVariables = {
        inviterName: 'Jane Doe',
        teamName: 'Acme Corp',
        invitationUrl: 'https://example.com/invite',
        role: 'admin',
        expiresIn: '7 days',
      };

      expect(
        registry.validateVariables('team-invitation', validVariables),
      ).toBe(true);
    });

    it('should reject invalid role in team-invitation', () => {
      const invalidVariables = {
        inviterName: 'Jane Doe',
        teamName: 'Acme Corp',
        invitationUrl: 'https://example.com/invite',
        role: 'invalid-role', // Invalid role
        expiresIn: '7 days',
      };

      expect(
        registry.validateVariables('team-invitation', invalidVariables),
      ).toBe(false);
    });

    it('should validate welcome variables', () => {
      const validVariables: WelcomeVariables = {
        userName: 'John Doe',
        dashboardUrl: 'https://example.com/dashboard',
        supportEmail: 'support@haystack.com',
      };

      expect(registry.validateVariables('welcome', validVariables)).toBe(true);
    });

    it('should validate two-factor-setup variables', () => {
      const validVariables: TwoFactorSetupVariables = {
        userName: 'John Doe',
        qrCodeUrl: 'https://example.com/qr',
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['123456', '789012'],
        supportEmail: 'support@haystack.com',
      };

      expect(
        registry.validateVariables('two-factor-setup', validVariables),
      ).toBe(true);
    });

    it('should reject empty backup codes', () => {
      const invalidVariables = {
        userName: 'John Doe',
        qrCodeUrl: 'https://example.com/qr',
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: [], // Empty array
        supportEmail: 'support@haystack.com',
      };

      expect(
        registry.validateVariables('two-factor-setup', invalidVariables),
      ).toBe(false);
    });

    it('should return false for non-existent template', () => {
      const variables = {
        userName: 'John Doe',
      };

      expect(registry.validateVariables('non-existent' as any, variables)).toBe(
        false,
      );
    });
  });

  describe('validateVariablesWithDetails', () => {
    it('should return validation details for valid variables', () => {
      const validVariables: EmailVerificationVariables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      const result = registry.validateVariablesWithDetails(
        'email-verification',
        validVariables,
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return validation details for invalid variables', () => {
      const invalidVariables = {
        userName: '',
        // Missing required fields
      };

      const result = registry.validateVariablesWithDetails(
        'email-verification',
        invalidVariables,
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
    });

    it('should return valid: false for non-existent template', () => {
      const result = registry.validateVariablesWithDetails(
        'non-existent' as any,
        {},
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
    });
  });
});
