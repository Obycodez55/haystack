import { ApiProperty } from '@nestjs/swagger';

export class TenantSettingsDto {
  @ApiProperty({
    description: 'Default currency (ISO 4217 code)',
    example: 'NGN',
  })
  defaultCurrency: string;

  @ApiProperty({
    description: 'Timezone (IANA timezone identifier)',
    example: 'Africa/Lagos',
  })
  timezone: string;
}
