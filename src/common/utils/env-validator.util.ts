/**
 * Environment variable validator
 * Validates required environment variables on startup
 * Fails fast with clear error messages if validation fails
 */
export class EnvValidator {
  /**
   * Validate required environment variables
   * Throws error if any required vars are missing
   */
  static validateRequired(requiredVars: string[]): void {
    const missing: string[] = [];

    requiredVars.forEach((varName) => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    if (missing.length > 0) {
      const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n\n` +
        `Please set these variables in your .env file or environment.\n` +
        `See .env.example for reference.`;

      console.error('\n❌ Environment Validation Failed\n');
      console.error(errorMessage);
      console.error('\n');

      throw new Error(errorMessage);
    }
  }

  /**
   * Validate environment variables with custom messages
   */
  static validateWithMessages(
    validations: Array<{ name: string; message?: string }>,
  ): void {
    const missing: Array<{ name: string; message: string }> = [];

    validations.forEach(({ name, message }) => {
      if (!process.env[name]) {
        missing.push({
          name,
          message: message || `${name} is required`,
        });
      }
    });

    if (missing.length > 0) {
      const errorMessage =
        'Missing required environment variables:\n\n' +
        missing
          .map(({ name, message }) => `  - ${name}: ${message}`)
          .join('\n') +
        '\n\nPlease set these variables in your .env file.';

      console.error('\n❌ Environment Validation Failed\n');
      console.error(errorMessage);
      console.error('\n');

      throw new Error(errorMessage);
    }
  }

  /**
   * Validate environment for production
   */
  static validateProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      const productionRequired = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'DATABASE_URL',
        'REDIS_HOST',
      ];

      this.validateWithMessages(
        productionRequired.map((name) => ({
          name,
          message: `Required for production environment`,
        })),
      );
    }
  }
}

