/**
 * User object attached to request by JwtAuthGuard
 */
export interface RequestUser {
  tenantId: string;
  email: string;
  name: string;
}
