import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantStatus,
  KycStatus,
} from '@modules/tenant/entities/tenant.entity';

export class TenantInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: TenantStatus })
  status: TenantStatus;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiProperty()
  defaultCurrency: string;

  @ApiProperty()
  timezone: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiry in seconds',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Tenant information',
    type: TenantInfoDto,
  })
  tenant: TenantInfoDto;
}

export class LoginResponseDto {
  @ApiPropertyOptional({
    description: 'Whether 2FA is required',
    example: false,
  })
  requires2FA?: boolean;

  @ApiPropertyOptional({
    description:
      'Temporary token for 2FA verification (only if requires2FA is true)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  temporaryToken?: string;

  @ApiPropertyOptional({
    description: 'Temporary token expiry in seconds',
    example: 300,
  })
  temporaryTokenExpiresIn?: number;

  @ApiPropertyOptional({
    description: 'Full auth response (only if 2FA is not required)',
    type: AuthResponseDto,
  })
  auth?: AuthResponseDto;
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'admin@acme.com',
  })
  email: string;

  @ApiProperty({
    description: 'Message',
    example:
      'Registration successful. Please check your email to verify your account.',
  })
  message: string;
}
