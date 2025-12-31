import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyMode } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key name (for identification)',
    example: 'Production API Key',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'API key mode',
    enum: ApiKeyMode,
    example: ApiKeyMode.TEST,
  })
  @IsEnum(ApiKeyMode)
  mode: ApiKeyMode;
}

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ApiKeyMode })
  mode: ApiKeyMode;

  @ApiProperty({
    description: 'API key (only shown once on creation)',
    example: 'sk_test_abc123...',
  })
  key: string;

  @ApiProperty()
  keyPrefix: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class ApiKeyListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ApiKeyMode })
  mode: ApiKeyMode;

  @ApiProperty()
  keyPrefix: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class RevokeApiKeyDto {
  @ApiPropertyOptional({
    description: 'Reason for revocation',
    example: 'Key compromised',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
