// IMPORTANT: Set environment variables BEFORE importing any modules
// This ensures ConfigModule validation passes during OpenAPI generation
process.env.GENERATE_OPENAPI = 'true';
process.env.SKIP_DB_CONNECTION = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || 'postgres';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'postgres';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'haystack';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'PLACEHOLDER_NOT_FOR_USE_JWT_SECRET';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'PLACEHOLDER_NOT_FOR_USE_JWT_REFRESH_SECRET';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateOpenApiSpec() {
  let app;
  try {
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false, // Don't abort on errors (like database connection failures)
    });
  } catch (error) {
    // If app creation fails due to database connection, try again with error handling
    // This can happen if TypeORM tries to connect during module initialization
    if (
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('connect') ||
        error.message.includes('database'))
    ) {
      console.warn(
        '⚠️  Database connection error during app creation, retrying with error handling...',
      );
      // Set flag to skip connection checks
      process.env.SKIP_DB_CONNECTION = 'true';
      app = await NestFactory.create(AppModule, {
        logger: false,
        abortOnError: false,
      });
    } else {
      throw error;
    }
  }

  const config = new DocumentBuilder()
    .setTitle('Haystack Payment Orchestration API')
    .setDescription(
      'Unified payment processing API for African businesses. ' +
        'Integrate with multiple payment providers (Paystack, Stripe, Flutterwave) through a single API.',
    )
    .setVersion('1.0')
    .setContact(
      'Haystack Support',
      'https://docs.haystack.com',
      'support@haystack.com',
    )
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
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api-staging.haystack.com', 'Staging environment')
    .addServer('https://api.haystack.com', 'Production environment')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  const outputPath = path.join(
    process.cwd(),
    'website',
    'static',
    'openapi.json',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI specification generated at: ${outputPath}`);
  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch((error) => {
  console.error('Error generating OpenAPI spec:', error);
  process.exit(1);
});
