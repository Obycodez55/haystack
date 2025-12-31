import {
  EmailSendOptions,
  TemplateName,
  TemplateVariablesMap,
} from '../interfaces';

/**
 * Email job data
 * Used for queue job payload
 */
export interface EmailJobData {
  options: EmailSendOptions;
  template?: TemplateName;
  templateVariables?: TemplateVariablesMap[TemplateName];
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}
