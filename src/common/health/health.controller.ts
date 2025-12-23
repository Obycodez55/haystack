import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
  ) {}

  /**
   * Basic health check endpoint
   * Returns 200 if service is running
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check', description: 'Comprehensive health check including memory and disk usage' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check() {
    return this.health.check([
      () => this.healthService.isHealthy('api'),
    ]);
  }

  /**
   * Liveness probe for Kubernetes/containers
   * Returns 200 if service is alive
   */
  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe', description: 'Kubernetes liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return this.health.check([
      () => this.healthService.isHealthy('api'),
    ]);
  }

  /**
   * Readiness probe for Kubernetes/containers
   * Returns 200 when service is ready to accept traffic
   * Will include database/redis checks when implemented
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe', description: 'Kubernetes readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  readiness() {
    return this.health.check([
      () => this.healthService.isHealthy('api'),
      // TODO: Add database check when implemented
      // () => this.healthService.isDatabaseHealthy(),
      // TODO: Add redis check when implemented
      // () => this.healthService.isRedisHealthy(),
    ]);
  }
}

