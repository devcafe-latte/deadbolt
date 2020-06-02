import { User } from '../User';
import { TotpTwoFactor } from './TotpTwoFactor';
import { EmailTwoFactor } from './EmailTwoFactor';
import { SmsTwoFactor } from './SmsTwoFactor';
import { Page } from '../Page';

export function get2fa(type: twoFactorType | string): twoFactor {
  switch (type) {
    case "totp":
      return new TotpTwoFactor();
    case "email":
      return new EmailTwoFactor();
    case "sms":
      return new SmsTwoFactor();
    default:
      throw new Error("Unknown TwoFactor type " + type);
  }
}

export interface twoFactor {
  type: twoFactorType;
  setup: (u: User) => Promise<any>;
  request: (u: User) => Promise<any>;
  verify: (u: User, data: any) => Promise<boolean>;
  getLatest: (u: User) => Promise<any>;
  getTokens: (page: number) => Promise<Page<any>>;
}

export type twoFactorType = "totp" | "email" | "sms";