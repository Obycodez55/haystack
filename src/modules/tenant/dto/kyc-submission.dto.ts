import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KycSubmissionDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({
    description: 'Company registration number',
    example: 'RC123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyRegistrationNumber?: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  @IsString()
  @MinLength(10)
  businessAddress: string;

  @ApiPropertyOptional({
    description: 'Additional KYC information (JSON)',
    example: { taxId: 'TAX123', industry: 'Fintech' },
  })
  @IsOptional()
  @ValidateIf((o) => o.metadata !== undefined)
  metadata?: Record<string, any>;
}
