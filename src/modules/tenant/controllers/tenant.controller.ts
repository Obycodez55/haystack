import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RequestUser } from '@modules/auth/types/request-user.interface';
import {
  TenantProfileDto,
  TenantSettingsDto,
  KycStatusDto,
  UpdateProfileDto,
  UpdateSettingsDto,
  KycSubmissionDto,
} from '../dto';

@ApiTags('tenant')
@Controller('tenant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Get current tenant profile
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current tenant profile' })
  @ApiResponse({
    status: 200,
    description: 'Tenant profile retrieved successfully',
    type: TenantProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getProfile(
    @Request() req: { user: RequestUser },
  ): Promise<TenantProfileDto> {
    return this.tenantService.getProfile(req.user.tenantId);
  }

  /**
   * Update tenant profile
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: TenantProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateProfile(
    @Request() req: { user: RequestUser },
    @Body() dto: UpdateProfileDto,
  ): Promise<TenantProfileDto> {
    return this.tenantService.updateProfile(req.user.tenantId, dto);
  }

  /**
   * Get tenant settings
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: TenantSettingsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getSettings(
    @Request() req: { user: RequestUser },
  ): Promise<TenantSettingsDto> {
    return this.tenantService.getSettings(req.user.tenantId);
  }

  /**
   * Update tenant settings
   */
  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: TenantSettingsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or currency/timezone',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateSettings(
    @Request() req: { user: RequestUser },
    @Body() dto: UpdateSettingsDto,
  ): Promise<TenantSettingsDto> {
    return this.tenantService.updateSettings(req.user.tenantId, dto);
  }

  /**
   * Submit KYC information
   */
  @Post('kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit KYC information' })
  @ApiResponse({
    status: 200,
    description: 'KYC submitted successfully',
    type: KycStatusDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or KYC already submitted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async submitKyc(
    @Request() req: { user: RequestUser },
    @Body() dto: KycSubmissionDto,
  ): Promise<KycStatusDto> {
    return this.tenantService.submitKyc(req.user.tenantId, dto);
  }

  /**
   * Get KYC status
   */
  @Get('kyc/status')
  @ApiOperation({ summary: 'Get KYC status' })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved successfully',
    type: KycStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getKycStatus(
    @Request() req: { user: RequestUser },
  ): Promise<KycStatusDto> {
    return this.tenantService.getKycStatus(req.user.tenantId);
  }
}
