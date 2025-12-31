import { IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupTwoFactorResponseDto {
  @ApiProperty({
    description: 'TOTP secret (for manual entry)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'QR code data URI (for scanning)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'Backup codes (save these securely!)',
    example: ['ABCD-EFGH', 'IJKL-MNOP'],
    type: [String],
  })
  backupCodes: string[];
}

export class VerifySetupTwoFactorDto {
  @ApiProperty({
    description: 'TOTP secret from setup step',
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsString()
  secret: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({
    description: 'Current password (required to disable 2FA)',
    example: 'SecurePass123!',
  })
  @IsString()
  password: string;
}

export class TwoFactorStatusDto {
  @ApiProperty({
    description: 'Whether 2FA is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'When 2FA was enabled',
    example: '2024-01-15T10:30:00Z',
  })
  enabledAt?: Date;

  @ApiProperty({
    description: 'Number of backup codes remaining',
    example: 8,
  })
  backupCodesRemaining: number;
}
