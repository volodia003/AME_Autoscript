import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { AuthService } from '../auth.service';
import googleConfig from '../config/google.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(googleConfig.KEY)
        googleConfiguration: ConfigType<typeof googleConfig>,
        private authService: AuthService,
    ) {
        super({
            clientID: googleConfiguration.clientID,
            clientSecret: googleConfiguration.clientSecret,
            callbackURL: googleConfiguration.callbackUrl,
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ) {
        console.log({ profile });
        console.log(profile)
        const user = await this.authService.validateGoogleUser({
            name: profile.name.givenName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 0,
        });
        // done(null, user);
        return user;
    }
}