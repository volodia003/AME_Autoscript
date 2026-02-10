import {
    Controller,
    Get,
    Header,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { GoogleOauthGuard } from './guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }


    @Get('google/login')
    @UseGuards(GoogleOauthGuard)
    async googleLogin() { console.log('Google login'); }

    @Get('google/callback')
    async oauthCallback(@Req() req: any, @Param() params: any) {
        const user = req.user;
        console.log('OAuth callback user:', req);
        console.log('OAuth callback params:', params);
        // Handle the login success scenario.
        // You might want to create a session or generate a JWT token to send back to the client.

    }

    @Get('callback')
    @Header('Content-Type', 'text/html; charset=utf-8')
    async callbackPage(@Query() query: any) {
        console.log('Callback query params:', query);

        return await this.authService.getCallbackPage();
    }
}