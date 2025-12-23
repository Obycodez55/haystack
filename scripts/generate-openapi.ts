import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const config = new DocumentBuilder()
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
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api-staging.haystack.com', 'Staging environment')
    .addServer('https://api.haystack.com', 'Production environment')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  const outputPath = path.join(process.cwd(), 'website', 'static', 'openapi.json');
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

