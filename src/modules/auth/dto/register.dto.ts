import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corp',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Email address (used for login)',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
