/**
 * Type-safe template variable interfaces
 * Each template has its own interface for compile-time safety
 */

export interface EmailVerificationVariables {
  userName: string;
  verificationUrl: string;
  expiresIn: string;
  supportEmail: string;
}

export interface PasswordResetVariables {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  supportEmail: string;
}

export interface TeamInvitationVariables {
  inviterName: string;
  teamName: string;
  invitationUrl: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  expiresIn: string;
}

export interface WelcomeVariables {
  userName: string;
  dashboardUrl: string;
  supportEmail: string;
}

export interface TwoFactorSetupVariables {
  userName: string;
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
  supportEmail: string;
}

/**
 * Template name to variables type mapping
 */
export type TemplateName =
  | 'email-verification'
  | 'password-reset'
  | 'team-invitation'
  | 'welcome'
  | 'two-factor-setup';

export type TemplateVariablesMap = {
  'email-verification': EmailVerificationVariables;
  'password-reset': PasswordResetVariables;
  'team-invitation': TeamInvitationVariables;
  welcome: WelcomeVariables;
  'two-factor-setup': TwoFactorSetupVariables;
};
