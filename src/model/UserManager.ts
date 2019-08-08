import { User } from './User';

export class UserManager {

  users: User[] = [];

  constructor() {
    //for debug
    const u = new User();
    u.userName = 'c00';
    u.setPassword('password');
    u.firstName = 'Co';
    u.lastName = 'van Leeuwen';

    this.users.push(u);
  }

  public login(userName: string, pass: string): LoginResult {
    const user = this.users.find((u) => u.userName === userName);
    if (!user) return LoginResult.failed("Not found");

    if (!user.checkPassword(pass)) {
      return LoginResult.failed("Password incorrect");
    }

    return LoginResult.success(user);
  }

  /* public renew(): User {

  } */
}

export class LoginResult {
  success: boolean = true;
  reason?: string;
  user?: User;
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