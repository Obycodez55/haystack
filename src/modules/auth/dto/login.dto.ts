import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePass123!',
  })
  @IsString()
  password: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: 'Temporary token from login response (when 2FA is enabled)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  temporaryToken: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app OR backup code',
    example: '123456',
  })
  @IsString()
  code: string;
}
