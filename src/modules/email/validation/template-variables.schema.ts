import * as Joi from 'joi';
import { TemplateName } from '../interfaces/template-variables.interface';

/**
 * Joi schemas for template variable validation
 * Ensures runtime type safety for template variables
 */

export const emailVerificationSchema = Joi.object({
  userName: Joi.string().required().min(1),
  verificationUrl: Joi.string().uri().required(),
  expiresIn: Joi.string().required(),
  supportEmail: Joi.string().email().required(),
});

export const passwordResetSchema = Joi.object({
  userName: Joi.string().required().min(1),
  resetUrl: Joi.string().uri().required(),
  expiresIn: Joi.string().required(),
  supportEmail: Joi.string().email().required(),
});

export const teamInvitationSchema = Joi.object({
  inviterName: Joi.string().required().min(1),
  teamName: Joi.string().required().min(1),
  invitationUrl: Joi.string().uri().required(),
  role: Joi.string().valid('owner', 'admin', 'developer', 'viewer').required(),
  expiresIn: Joi.string().required(),
});

export const welcomeSchema = Joi.object({
  userName: Joi.string().required().min(1),
  dashboardUrl: Joi.string().uri().required(),
  supportEmail: Joi.string().email().required(),
});

export const twoFactorSetupSchema = Joi.object({
  userName: Joi.string().required().min(1),
  qrCodeUrl: Joi.string().uri().required(),
  secret: Joi.string().required().min(1),
  backupCodes: Joi.array().items(Joi.string()).min(1).required(),
  supportEmail: Joi.string().email().required(),
});

/**
 * Map of template names to their Joi validation schemas
 */
export const templateSchemas: Record<TemplateName, Joi.ObjectSchema> = {
  'email-verification': emailVerificationSchema,
  'password-reset': passwordResetSchema,
  'team-invitation': teamInvitationSchema,
  welcome: welcomeSchema,
  'two-factor-setup': twoFactorSetupSchema,
};
