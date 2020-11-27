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

  dbUseSsl: boolean = this.getBoolean(process.env.DB_USE_SSL, false);
  dbCaPath: string = process.env.DB_CA_PATH || '/app/cert/ca-certificate.crt';

  seed: boolean = this.getBoolean(process.env.SEED_DEADBOLT);

  //All in hours
  sessionExpires: number = Number(process.env.SESSION_HOURS) || 24 * 14;
  confirmTokenExpires: number = Number(process.env.CONFIRM_TOKEN_EXPIRES_HOURS) || 24 * 7;
  resetTokenExpires: number = Number(process.env.RESET_TOKEN_EXPIRES_HOURS) || 24;

  email2faTokenExpires: number = Number(process.env.EMAIL_2FA_EXPIRES) || 2;

  totpWindow: number = Number(process.env.TOTP_WINDOW) || 5;

  //todo implement
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