import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from '@common';
import { DatabaseService } from '@common/database';
import { RedisService } from '@common/redis';
import { ValidationPipe as CustomValidationPipe } from '@common/pipes';
import { EnvValidator } from '@common/utils';
import { AppConfig } from '@config';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';

/**
 * Validate environment variables before starting the application
 * This ensures we fail fast if required variables are missing
 */
function validateEnvironment(): void {
  // Required environment variables
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  EnvValidator.validateRequired(requiredVars);

  // Production-specific validation
  EnvValidator.validateProduction();

  console.log('✅ Environment validation passed');
}

async function bootstrap() {
  // Validate environment variables first (before creating app)
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });

  // Get logger instance and set as NestJS logger
  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  // Get configuration
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');

  if (!appConfig) {
    throw new Error('App configuration is missing. Please check your environment variables.');
  }

  // Verify database connection
  try {
    const databaseService = app.get(DatabaseService);
    const dbHealth = await databaseService.checkHealth();
    if (dbHealth.status === 'up') {
      logger.log('Database connection verified', {
        responseTime: dbHealth.responseTime,
      });
    } else {
      logger.warn('Database connection check failed', { error: dbHealth.error });
    }
  } catch (error) {
    logger.warn('Database service not available', { error: error.message });
  }

  // Verify Redis connection
  try {
    const redisService = app.get(RedisService);
    const redisHealth = await redisService.healthCheck();
    if (redisHealth.status === 'up') {
      logger.log('Redis connection verified', {
        latency: redisHealth.latency,
      });
    } else {
      logger.warn('Redis connection check failed', { error: redisHealth.error });
    }
  } catch (error) {
    logger.warn('Redis service not available', { error: error.message });
  }

  // Global prefix (e.g., /api)
  // Exclude health checks from global prefix - they should be at root level
  app.setGlobalPrefix(appConfig.globalPrefix, {
    exclude: ['/health', '/health/(.*)'],
  });

  // API versioning (e.g., /api/v1)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });

  // Security headers (Helmet)
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
  }));

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Correlation-ID',
      'Idempotency-Key',
      'X-API-Version',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Response compression
  app.use(compression());

  // Request timeout (30 seconds default)
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  app.use((req, res, next) => {
    req.setTimeout(timeout, () => {
      res.status(408).json({
        success: false,
        error: {
          code: 'request_timeout',
          message: 'Request timeout. Please try again.',
          type: 'client_error',
        },
        meta: {
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    });
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new CustomValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Get port for Swagger configuration
  const port = appConfig.port;

  // Swagger/OpenAPI configuration
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Haystack Payment Orchestration API')
      .setDescription(
        'Unified payment processing API for African businesses. ' +
        'Integrate with multiple payment providers (Paystack, Stripe, Flutterwave) through a single API.',
      )
      .setVersion('1.0')
      .setContact('Haystack Support', 'https://docs.haystack.com', 'support@haystack.com')
      .setLicense('UNLICENSED', '')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your API key (Bearer token)',
          in: 'header',
        },
        'bearer',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'Alternative API key authentication',
        },
        'api-key',
      )
      .addTag('payments', 'Payment processing endpoints')
      .addTag('providers', 'Payment provider management')
      .addTag('webhooks', 'Webhook endpoints')
      .addTag('health', 'Health check endpoints')
      .addServer(`http://localhost:${port}`, 'Local development')
      .addServer('https://api-staging.haystack.com', 'Staging environment')
      .addServer('https://api.haystack.com', 'Production environment')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('api-docs', app, document, {
      customSiteTitle: 'Haystack API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    });

    // Also generate OpenAPI JSON file for Docusaurus
    if (process.env.GENERATE_OPENAPI === 'true') {
      const fs = require('fs');
      const path = require('path');
      const openApiPath = path.join(process.cwd(), 'website', 'static', 'openapi.json');
      fs.mkdirSync(path.dirname(openApiPath), { recursive: true });
      fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
      logger.log(`OpenAPI specification written to: ${openApiPath}`);
    }

    logger.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Give ongoing requests time to complete (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Close the application
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', reason as Error, { promise });
    gracefulShutdown('unhandledRejection');
  });

  await app.listen(port);

  logger.log(
    `Application is running on: http://localhost:${port}/${appConfig.globalPrefix}/${appConfig.apiVersion}`,
  );
  logger.log(`Health check available at: http://localhost:${port}/health`);
}

bootstrap();
