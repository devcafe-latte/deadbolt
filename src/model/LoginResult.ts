import { User } from './User';

export class LoginResult {
  success: boolean = true;
  reason?: string;
  user?: User;
  twoFactorData?: any;

  constructor() {}

  static twoFactor(user: User, data: any): LoginResult {
    const r = new LoginResult();
    r.user = user;
    r.twoFactorData = {
      type: user.twoFactor,
      ...data
    };
    return r;
  }

  static success(user: User): LoginResult {
    const r = new LoginResult();
    r.user = user;
    return r;
  } 

  static failed(reason: string): LoginResult {
    const r = new LoginResult();
    r.success = false;
    r.reason = reason;
    return r;
  }
}