import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Default currency (ISO 4217 code)',
    example: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR'],
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid ISO 4217 code (3 uppercase letters)',
  })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Timezone (IANA timezone identifier)',
    example: 'Africa/Lagos',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
