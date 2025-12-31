import Joi from 'joi';
import {
  TemplateName,
  TemplateVariablesMap,
} from '../interfaces/template-variables.interface';
import { templateSchemas } from '../validation/template-variables.schema';

/**
 * Template metadata
 */
interface TemplateMetadata<T = any> {
  name: string;
  file: string;
  subjectFile?: string;
  defaultSubject?: string;
  category: 'auth' | 'team' | 'system' | 'marketing';
  description: string;
}

/**
 * Template registry
 * Registers all email templates with type-safe variable interfaces
 */
export class TemplateRegistry {
  private templates = new Map<string, TemplateMetadata>();

  constructor() {
    this.registerTemplates();
  }

  /**
   * Register all templates
   */
  private registerTemplates() {
    // Email verification
    this.register({
      name: 'email-verification',
      file: 'email-verification.hbs',
      subjectFile: 'email-verification.subject.hbs',
      defaultSubject: 'Verify your email address',
      category: 'auth',
      description: 'Email verification for new users',
    });

    // Password reset
    this.register({
      name: 'password-reset',
      file: 'password-reset.hbs',
      subjectFile: 'password-reset.subject.hbs',
      defaultSubject: 'Reset your password',
      category: 'auth',
      description: 'Password reset email',
    });

    // Team invitation
    this.register({
      name: 'team-invitation',
      file: 'team-invitation.hbs',
      subjectFile: 'team-invitation.subject.hbs',
      defaultSubject: 'You have been invited to join {{teamName}}',
      category: 'team',
      description: 'Team member invitation email',
    });

    // Welcome email
    this.register({
      name: 'welcome',
      file: 'welcome.hbs',
      subjectFile: 'welcome.subject.hbs',
      defaultSubject: 'Welcome to Haystack!',
      category: 'system',
      description: 'Welcome email for new users',
    });

    // 2FA setup
    this.register({
      name: 'two-factor-setup',
      file: 'two-factor-setup.hbs',
      subjectFile: 'two-factor-setup.subject.hbs',
      defaultSubject: 'Set up two-factor authentication',
      category: 'auth',
      description: '2FA setup instructions with QR code',
    });
  }

  /**
   * Register a template
   */
  register(metadata: TemplateMetadata) {
    this.templates.set(metadata.name, metadata);
  }

  /**
   * Get template metadata
   */
  get<T extends TemplateName>(
    name: T,
  ): TemplateMetadata<TemplateVariablesMap[T]> | undefined {
    return this.templates.get(name) as
      | TemplateMetadata<TemplateVariablesMap[T]>
      | undefined;
  }

  /**
   * Get all registered templates
   */
  getAll(): TemplateMetadata[] {
    return Array.from(this.templates.values());
  }

  /**
   * Check if template exists
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Validate template variables using Joi schemas
   * Provides runtime type safety and validation
   */
  validateVariables<T extends TemplateName>(
    name: T,
    variables: unknown,
  ): variables is TemplateVariablesMap[T] {
    const schema = templateSchemas[name];
    if (!schema) {
      return false;
    }

    const { error } = schema.validate(variables, {
      abortEarly: false,
      stripUnknown: true,
    });

    return !error;
  }

  /**
   * Validate and get validation error details
   * Useful for debugging and error messages
   */
  validateVariablesWithDetails<T extends TemplateName>(
    name: T,
    variables: unknown,
  ): { valid: boolean; error?: Joi.ValidationError } {
    const schema = templateSchemas[name];
    if (!schema) {
      return {
        valid: false,
        error: new Joi.ValidationError(
          `Template "${name}" not found`,
          [],
          variables,
        ),
      };
    }

    const { error } = schema.validate(variables, {
      abortEarly: false,
      stripUnknown: true,
    });

    return {
      valid: !error,
      error: error || undefined,
    };
  }
}
