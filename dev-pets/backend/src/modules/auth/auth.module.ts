import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';

import { GoogleStrategy } from './strategies/google.strategy';
import googleConfig from './config/google.config';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';

@Module({
    imports: [
        ConfigModule.forFeature(googleConfig),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        GoogleStrategy,
    ],
})
export class AuthModule { }