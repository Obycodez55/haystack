import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ValidationError } from '@errors';

/**
 * API Version Guard
 * Validates API version from URL path or header
 */
@Injectable()
export class VersionGuard implements CanActivate {
  private readonly supportedVersions = ['v1'];
  private readonly defaultVersion = 'v1';

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const version = this.extractVersion(request);

    if (!this.supportedVersions.includes(version)) {
      throw ValidationError.invalidValue(
        'version',
        version,
        `Supported versions: ${this.supportedVersions.join(', ')}`,
      );
    }

    // Store version in request for later use
    request.apiVersion = version;
    return true;
  }

  /**
   * Extract version from URL path or header
   */
  private extractVersion(request: any): string {
    // Check URL path first (e.g., /v1/payments)
    const pathMatch = request.url?.match(/^\/(v\d+)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Check Accept header (e.g., application/vnd.api.v1+json)
    const acceptHeader = request.headers['accept'];
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/version[= ](v\d+)/i);
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    // Check custom header
    const versionHeader = request.headers['x-api-version'];
    if (versionHeader) {
      return versionHeader;
    }

    // Default to v1
    return this.defaultVersion;
  }
}

