import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailVerificationDto {
  @ApiProperty({
    description: 'Email address to resend verification email',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token (from email)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;
}
