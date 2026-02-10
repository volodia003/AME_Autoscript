import { registerAs } from "@nestjs/config";

type OAuthConfig = {
    clientID: string,
    clientSecret: string,
    callbackUrl: string
}

export default registerAs("googleOAuthConfig", (): OAuthConfig => ({
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL as string
}))