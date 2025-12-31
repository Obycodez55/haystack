import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { convert } from 'html-to-text';
import { EmailConfig } from '@config/email.config';
import { TemplateRegistry } from '../templates/template.registry';
import {
  TemplateName,
  TemplateVariablesMap,
} from '../interfaces/template-variables.interface';

/**
 * Rendered email content
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Template service
 * Handles template loading, compilation, and rendering
 * Templates are loaded on-demand from filesystem (no caching)
 */
@Injectable()
export class TemplateService {
  private registry: TemplateRegistry;

  constructor(private configService: ConfigService) {
    this.registry = new TemplateRegistry();
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers() {
    // Format date
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      if (format === 'short') {
        return d.toLocaleDateString();
      }
      if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return d.toLocaleDateString();
    });

    // Format currency
    Handlebars.registerHelper(
      'formatCurrency',
      (amount: number, currency: string) => {
        if (typeof amount !== 'number') return '';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'NGN',
        }).format(amount);
      },
    );

    // Conditional rendering
    Handlebars.registerHelper('ifEquals', (a: any, b: any, options: any) => {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // Current date/time
    Handlebars.registerHelper('now', () => {
      return new Date();
    });

    // Uppercase
    Handlebars.registerHelper('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    // Lowercase
    Handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });
  }

  /**
   * Render template
   * Loads template from filesystem on-demand
   */
  async render<T extends TemplateName>(
    templateName: T,
    variables: TemplateVariablesMap[T],
  ): Promise<RenderedEmail> {
    // Validate template exists
    const template = this.registry.get(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Validate variables with detailed error messages
    const validation = this.registry.validateVariablesWithDetails(
      templateName,
      variables,
    );

    if (!validation.valid) {
      const errorMessage = validation.error
        ? validation.error.details.map((d) => d.message).join('; ')
        : `Invalid variables for template "${templateName}"`;

      throw new Error(errorMessage);
    }

    const emailConfig = this.configService.get<EmailConfig>('email');
    if (!emailConfig) {
      throw new Error('Email configuration is missing');
    }

    const templatesDir = path.join(
      process.cwd(),
      emailConfig.templates.directory,
    );

    // Load HTML template
    const htmlPath = path.join(templatesDir, template.file);
    let htmlContent: string;
    try {
      htmlContent = await fs.readFile(htmlPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Template file not found: ${template.file} at ${htmlPath}`,
      );
    }

    // Compile and render HTML
    const htmlTemplate = Handlebars.compile(htmlContent);
    const html = htmlTemplate(variables);

    // Load subject template if exists
    let subject = template.defaultSubject || 'No Subject';
    if (template.subjectFile) {
      const subjectPath = path.join(templatesDir, template.subjectFile);
      try {
        const subjectContent = await fs.readFile(subjectPath, 'utf-8');
        const subjectTemplate = Handlebars.compile(subjectContent);
        subject = subjectTemplate(variables);
      } catch {
        // Subject file optional, use default
      }
    }

    // Generate plain text version using html-to-text package
    const text = convert(html, {
      wordwrap: 80,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } },
        { selector: 'img', format: 'skip' },
      ],
    });

    return { subject, html, text };
  }

  /**
   * Get template registry
   */
  getRegistry(): TemplateRegistry {
    return this.registry;
  }
}
