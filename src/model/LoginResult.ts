import { User } from './User';

export class LoginResult {
  success: boolean = true;
  reason?: string;
  user?: User;
  jwt?: string;

  constructor() {}

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