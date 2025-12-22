import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@config';
import { LoggingModule } from './logging/logging.module';

/**
 * Global Common Module
 * Registers all common services and utilities:
 * - Configuration (with validation)
 * - Logging (structured logging with Pino)
 * 
 * This module should be imported in AppModule
 */
@Global()
@Module({
  imports: [ConfigModule, LoggingModule],
  exports: [ConfigModule, LoggingModule],
})
export class CommonModule {}

