import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmFeatureModule } from '@common/openapi';
import { ApiKeyEntity } from './entities/api-key.entity';
import { TwoFactorEntity } from './entities/two-factor.entity';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { TwoFactorRepository } from './repositories/two-factor.repository';
import { AuthService } from './services/auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { JwtAuthService } from './services/jwt-auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantModule } from '../tenant/tenant.module';
import { EmailModule } from '../email/email.module';
import { JwtConfig } from '@config/jwt.config';

@Module({
  imports: [
    TypeOrmFeatureModule([ApiKeyEntity, TwoFactorEntity]),
    // JWT module configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>('jwt');
        if (!jwtConfig) {
          throw new Error('JWT configuration is missing');
        }
        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: parseInt(jwtConfig.expiresIn),
          },
        } satisfies JwtModuleOptions;
      },
    }),
    // Forward refs to avoid circular dependencies
    forwardRef(() => TenantModule),
    EmailModule,
  ],
  providers: [
    ApiKeyRepository,
    TwoFactorRepository,
    AuthService,
    TwoFactorService,
    JwtAuthService,
    JwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    TwoFactorService,
    JwtAuthService,
    ApiKeyRepository,
    TwoFactorRepository,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
