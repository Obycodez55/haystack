import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from '@common';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AppController');
  }

  @Get()
  @Version('1')
  getHello(): string {
    this.logger.log('GET / endpoint called');
    return this.appService.getHello();
  }
}
