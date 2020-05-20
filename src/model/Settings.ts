import { getEnumValue } from './helpers';
export class Settings {
  debug: boolean = (process.env.NODE_ENV !== "production");

  max2faAttempts: number = Number(process.env.MAX_2FA_ATTEMPTS) || 3;
   
  emailTwoFactorTokenType: twoFactorTokenType = getEnumValue<twoFactorTokenType>(process.env.EMAIL_2FA_TOKEN_TYPE, twoFactorTokenType, twoFactorTokenType.digits);
  otpLabel: string = process.env.OTP_LABEL || "some_label";
  otpIssuer: string = process.env.OTP_ISSUER || "some_issuer";

  port: number = Number(process.env.PORT) || 3000;
  dbHost: string = process.env.DB_HOST || 'localhost';
  dbUser: string = process.env.DB_USER || 'root';
  dbPass: string = process.env.DB_PASS || '';
  dbPort: number = Number(process.env.DB_PORT) || 3306;
  dbName: string = process.env.DB_NAME || 'deadbolt';

  //All in hours
  sessionExpires: number = Number(process.env.SESSION_HOURS) || 24 * 14;
  confirmTokenExpires: number = Number(process.env.CONFIRM_TOKEN_EXPIRES_HOURS) || 24 * 7;
  resetTokenExpires: number = Number(process.env.RESET_TOKEN_EXPIRES_HOURS) || 24;

  requireApp: boolean = this.getBoolean(process.env.REQUIRE_APP_ON_LOGIN);

  private getBoolean(val: string, defaultValue = false): boolean {
    if (val === null || val === undefined || val === "") return defaultValue;
    if (val === "0" || val === "false") return false;
    return true;
  }

}

export enum twoFactorTokenType {
  uuid = 'uuid',
  digits= 'digits',
} 