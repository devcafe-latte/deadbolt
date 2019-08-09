import { User } from './User';
import { Session } from './Session';
import container from './DiContainer';
import { SqlHelper } from './helpers';

export class UserManager {

  constructor() {

  }

  public async getUser(id: number) {
    await container.ready();

    const rows = await container.db.query("SELECT * FROM user WHERE id = ?", [id]);
    if (rows.length === 0) return null;

    const user = User.fromDb(rows[0]);
    return user;
  }

  public async login(username: string, pass: string): Promise<LoginResult> {
    await container.ready();

    const rows = await container.db.query("SELECT * FROM user WHERE username = ?", [username]);
    if (rows.length === 0) return LoginResult.failed("Not found");

    const user = User.fromDb(rows[0]);

    if (!user.checkPassword(pass)) {
      return LoginResult.failed("Password incorrect");
    }

    user.session = await Session.new(user);
    return LoginResult.success(user);
  }

  public async updateUser(user: User): Promise<number> {
    const update = SqlHelper.update('user', user.toDb());
    update.sql += " WHERE id = ?";
    update.values.push(user.id);
    const result = await container.db.query(update.sql, update.values);

    return result.affectedRows;
  }

  public async activateUser(userId: number, active: boolean) {
    const update = SqlHelper.update('user', { active });
    update.sql += " WHERE id = ?";
    update.values.push(userId);
    const result = await container.db.query(update.sql, update.values);

    return result.affectedRows;
  }

  public addUser() {

  }

  public removeUser() {

  }

  public renewSession() {

  }
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