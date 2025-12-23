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
  @ApiOperation({ summary: 'Health check', description: 'Comprehensive health check including API, database, and Redis' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check() {
    return this.health.check([
      () => this.healthService.isHealthy('api'),
      () => this.healthService.isDatabaseHealthy(),
      () => this.healthService.isRedisHealthy(),
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
   * Includes database and Redis checks
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe', description: 'Kubernetes readiness probe endpoint including database and Redis checks' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  readiness() {
    return this.health.check([
      () => this.healthService.isHealthy('api'),
      () => this.healthService.isDatabaseHealthy(),
      () => this.healthService.isRedisHealthy(),
    ]);
  }
}

