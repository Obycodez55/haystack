import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { RequestUser } from '../types/request-user.interface';
import {
  RegisterDto,
  LoginDto,
  VerifyTwoFactorDto,
  LoginResponseDto,
  RegisterResponseDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  RequestEmailVerificationDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyListDto,
  SetupTwoFactorResponseDto,
  VerifySetupTwoFactorDto,
  DisableTwoFactorDto,
  TwoFactorStatusDto,
} from '../dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  /**
   * Register a new tenant
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new tenant account' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email already exists',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Login tenant
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login tenant' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Verify 2FA code and complete login
   */
  @Post('login/verify-2fa')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code and complete login' })
  @ApiResponse({
    status: 200,
    description: '2FA verified, login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyTwoFactor(dto);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Reset password
   */
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  /**
   * Request email verification (resend verification email)
   */
  @Post('request-email-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request email verification (resend verification email)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Verification email sent (if account exists and is unverified)',
  })
  async requestEmailVerification(
    @Body() dto: RequestEmailVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.requestEmailVerification(dto);
  }

  /**
   * Verify email
   */
  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto);
  }

  /**
   * Create API key
   */
  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created',
    type: ApiKeyResponseDto,
  })
  async createApiKey(
    @Request() req: { user: RequestUser },
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.authService.createApiKey(req.user.tenantId, dto);
  }

  /**
   * List API keys
   */
  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all API keys for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'API keys list',
    type: [ApiKeyListDto],
  })
  async listApiKeys(
    @Request() req: { user: RequestUser },
  ): Promise<ApiKeyListDto[]> {
    return this.authService.listApiKeys(req.user.tenantId);
  }

  /**
   * Revoke API key
   */
  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(
    @Request() req: { user: RequestUser },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.authService.revokeApiKey(req.user.tenantId, id);
  }

  /**
   * Setup 2FA (generate secret and QR code)
   */
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({
    status: 200,
    description: '2FA setup data generated',
    type: SetupTwoFactorResponseDto,
  })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async setupTwoFactor(
    @Request() req: { user: RequestUser },
  ): Promise<SetupTwoFactorResponseDto> {
    return this.twoFactorService.generateSecret(req.user.tenantId);
  }

  /**
   * Verify 2FA setup and enable
   */
  @Post('2fa/verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code and enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code' })
  async verifySetupTwoFactor(
    @Request() req: { user: RequestUser },
    @Body() dto: VerifySetupTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.verifySetup(
      req.user.tenantId,
      dto.secret,
      dto.code,
    );
    return { message: '2FA enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires password)' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async disableTwoFactor(
    @Request() req: { user: RequestUser },
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.disable(req.user.tenantId, dto.password);
    return { message: '2FA disabled successfully' };
  }

  /**
   * Regenerate backup codes
   */
  @Post('2fa/regenerate-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate 2FA backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated',
    type: [String],
  })
  async regenerateBackupCodes(
    @Request() req: { user: RequestUser },
  ): Promise<{ backupCodes: string[] }> {
    const codes = await this.twoFactorService.regenerateBackupCodes(
      req.user.tenantId,
    );
    return { backupCodes: codes };
  }

  /**
   * Get 2FA status
   */
  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 2FA status for current tenant' })
  @ApiResponse({
    status: 200,
    description: '2FA status',
    type: TwoFactorStatusDto,
  })
  async getTwoFactorStatus(
    @Request() req: { user: RequestUser },
  ): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.getStatus(req.user.tenantId);
  }
}
