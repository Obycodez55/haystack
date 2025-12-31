import { EmailService } from '../services/email.service';
import {
  EmailVerificationVariables,
  PasswordResetVariables,
  TeamInvitationVariables,
  WelcomeVariables,
  TwoFactorSetupVariables,
} from '../interfaces/template-variables.interface';
import { EmailResult } from '../interfaces';

/**
 * Type-safe email helper functions
 * Provides convenient, type-safe methods for sending common emails
 */
export class EmailHelpers {
  /**
   * Send email verification email
   */
  static async sendVerificationEmail(
    service: EmailService,
    to: string,
    variables: EmailVerificationVariables,
    options?: {
      tenantId?: string;
      userId?: string;
      logEmail?: boolean;
    },
  ): Promise<EmailResult> {
    return service.sendWithTemplate({
      to,
      template: 'email-verification',
      templateVariables: variables,
      tenantId: options?.tenantId,
      userId: options?.userId,
      logEmail: options?.logEmail,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    service: EmailService,
    to: string,
    variables: PasswordResetVariables,
    options?: {
      tenantId?: string;
      userId?: string;
      logEmail?: boolean;
    },
  ): Promise<EmailResult> {
    return service.sendWithTemplate({
      to,
      template: 'password-reset',
      templateVariables: variables,
      tenantId: options?.tenantId,
      userId: options?.userId,
      logEmail: options?.logEmail,
    });
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitationEmail(
    service: EmailService,
    to: string,
    variables: TeamInvitationVariables,
    options?: {
      tenantId?: string;
      userId?: string;
      logEmail?: boolean;
    },
  ): Promise<EmailResult> {
    return service.sendWithTemplate({
      to,
      template: 'team-invitation',
      templateVariables: variables,
      tenantId: options?.tenantId,
      userId: options?.userId,
      logEmail: options?.logEmail,
    });
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    service: EmailService,
    to: string,
    variables: WelcomeVariables,
    options?: {
      tenantId?: string;
      userId?: string;
      logEmail?: boolean;
    },
  ): Promise<EmailResult> {
    return service.sendWithTemplate({
      to,
      template: 'welcome',
      templateVariables: variables,
      tenantId: options?.tenantId,
      userId: options?.userId,
      logEmail: options?.logEmail,
    });
  }

  /**
   * Send two-factor authentication setup email
   */
  static async sendTwoFactorSetupEmail(
    service: EmailService,
    to: string,
    variables: TwoFactorSetupVariables,
    options?: {
      tenantId?: string;
      userId?: string;
      logEmail?: boolean;
    },
  ): Promise<EmailResult> {
    return service.sendWithTemplate({
      to,
      template: 'two-factor-setup',
      templateVariables: variables,
      tenantId: options?.tenantId,
      userId: options?.userId,
      logEmail: options?.logEmail,
    });
  }
}
