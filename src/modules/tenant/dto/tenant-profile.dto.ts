import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, KycStatus } from '../entities/tenant.entity';

export class TenantProfileDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corp',
  })
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'admin@acme.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Tenant status',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Company registration number',
    example: 'RC123456',
  })
  companyRegistrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348012345678',
  })
  phone?: string;

  @ApiProperty({
    description: 'Default currency',
    example: 'NGN',
  })
  defaultCurrency: string;

  @ApiProperty({
    description: 'Timezone',
    example: 'Africa/Lagos',
  })
  timezone: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
