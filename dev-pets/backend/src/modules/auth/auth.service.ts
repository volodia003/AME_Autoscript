import { Injectable } from "@nestjs/common";
import { GoogleUserDto } from "./dto/oauth.dto";
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AuthService {
    private readonly callbackFileDir = path.join(__dirname, "../../../..", 'static', 'callback.html');

    async validateGoogleUser(profile: GoogleUserDto) {
        //validate and/or create user in the database
    }

    async getCallbackPage() {
        console.log(this.callbackFileDir);
        const callbackFile = await fs.readFile(this.callbackFileDir, 'utf-8');
        return callbackFile;
    }

}