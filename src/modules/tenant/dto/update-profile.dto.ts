import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Tenant name',
    example: 'Acme Corp',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Company registration number',
    example: 'RC123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyRegistrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
