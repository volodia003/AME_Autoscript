import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OAuth2TokenResponse {
    @IsNotEmpty()
    @IsString()
    access_token!: string;

    @IsNotEmpty()
    @IsString()
    refresh_token!: string;

    @IsNotEmpty()
    @IsNumber()
    expires_in!: number;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsNotEmpty()
    @IsString()
    avatar!: string;
}

export class GoogleUserDto extends OAuth2TokenResponse { }