import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from '../entities/tenant.entity';

export class KycStatusDto {
  @ApiProperty({
    description: 'KYC status',
    enum: KycStatus,
    example: KycStatus.PENDING,
  })
  status: KycStatus;

  @ApiPropertyOptional({
    description: 'When KYC was submitted',
    example: '2024-01-01T00:00:00Z',
  })
  submittedAt?: Date;

  @ApiPropertyOptional({
    description: 'When KYC was approved',
    example: '2024-01-02T00:00:00Z',
  })
  approvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Rejection reason (if rejected)',
    example: 'Incomplete documentation',
  })
  rejectedReason?: string;
}
