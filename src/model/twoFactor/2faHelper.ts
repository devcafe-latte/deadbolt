import { User } from '../User';
import { TotpTwoFactor } from './TotpTwoFactor';
import { EmailTwoFactor } from './EmailTwoFactor';

export function get2fa(type: twoFactorType | string): twoFactor {
  switch (type) {
    case "totp":
      return new TotpTwoFactor();
    case "email":
      return new EmailTwoFactor();
    default:
      throw new Error("Unknown TwoFactor type " + type);
  }
}

export interface twoFactor {
  type: twoFactorType;
  setup: (u: User) => Promise<any>;
  request: (u: User) => Promise<any>;
  verify: (u: User, data: any) => Promise<boolean>;
}

export type twoFactorType = "totp" | "email";