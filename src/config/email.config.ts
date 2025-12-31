import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  defaultProvider: string;
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  templates: {
    directory: string;
    defaultLocale: string;
  };
  providers: {
    brevo: {
      apiKey: string;
      apiUrl?: string;
    };
  };
  retry: {
    maxAttempts: number;
    backoffDelay: number;
  };
  tracking: {
    enabled: boolean;
    trackOpens: boolean;
    trackClicks: boolean;
  };
}

export default registerAs('email', (): EmailConfig => {
  return {
    defaultProvider: process.env.EMAIL_DEFAULT_PROVIDER || 'brevo',
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Haystack',
      email: process.env.EMAIL_FROM_EMAIL || 'noreply@haystack.com',
    },
    replyTo: process.env.EMAIL_REPLY_TO,
    templates: {
      directory:
        process.env.EMAIL_TEMPLATES_DIRECTORY || 'src/modules/email/templates',
      defaultLocale: process.env.EMAIL_DEFAULT_LOCALE || 'en',
    },
    providers: {
      brevo: {
        apiKey: process.env.BREVO_API_KEY || '',
        apiUrl: process.env.BREVO_API_URL || 'https://api.brevo.com/v3',
      },
    },
    retry: {
      maxAttempts: parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS || '3', 10),
      backoffDelay: parseInt(
        process.env.EMAIL_RETRY_BACKOFF_DELAY || '2000',
        10,
      ),
    },
    tracking: {
      enabled: process.env.EMAIL_TRACKING_ENABLED !== 'false',
      trackOpens: process.env.EMAIL_TRACK_OPENS === 'true',
      trackClicks: process.env.EMAIL_TRACK_CLICKS === 'true',
    },
  };
});
