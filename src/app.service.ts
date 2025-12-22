import { Injectable } from '@nestjs/common';
import { LoggerService } from '@logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('AppService');
  }

  getHello(): string {
    this.logger.log('Hello endpoint called');
    return 'Hello World!';
  }
}
