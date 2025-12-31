import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token (from email)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
