import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { LoggerService } from '@common';

@ApiTags('health')
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
  @ApiOperation({ summary: 'Get API status', description: 'Returns a simple hello message indicating the API is running' })
  @ApiResponse({ status: 200, description: 'API is running successfully' })
  getHello(): string {
    this.logger.log('GET / endpoint called');
    return this.appService.getHello();
  }
}
