import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';

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

