import moment from 'moment';
import uuidv4 from 'uuid/v4';

import container from './DiContainer';
import { SqlHelper } from './helpers';
import { LoginResult } from './LoginResult';
import { Session } from './Session';
import { User } from './User';

export class UserManager {
  private _sessionHours: number;

  constructor() {
    //Default to 2 weeks.
    this._sessionHours = Number(process.env.SESSION_HOURS) || 24 * 14;
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

    if (!user.active) {
      return LoginResult.failed("User cannot login");
    }

    await this.createSession(user);

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
    if (!active) this.expireAllSessions(userId);

    return result.affectedRows;
  }

  public async addUser(user: User) {
    user.uuid = uuidv4();
    user.created = moment();
    user.lastActivity = moment();
    
    const result = await container.db.query("INSERT INTO `user` SET ?", user.toDb());
    user.id = result.insertId;
  }

  public async removeUser(id: Number) {
    await container.db.query("DELETE FROM `user` WHERE id = ?", [id]);
  }

  public async validateSession(token: string): Promise<Session|null> {
    const now = moment().unix();
    const rows = await container.db.query("SELECT * FROM `session` WHERE `token` = ? AND `expires` > ?", [token, now]);
    if (rows.length === 0) return null;

    const session = Session.fromDb(rows[0]);
    this.touchSession(session);
    return session;
  }

  public async expireSession(token: string) {
    const expires = moment().subtract(1, 'second').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `token` = ?", [expires, token]);
  }

  public async expireAllSessions(userId: number) {
    const expires = moment().subtract(1, 'second').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `userId` = ?", [expires, userId]);
  }

  private async touchSession(session: Session) {
    const expires = moment().add(this._sessionHours, 'hours').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `token` = ?", [expires, session.token]);
    await container.db.query("UPDATE `user` SET `lastActivity` = ? WHERE `id` = ?", [moment().unix(), session.userId]);
  }

  private async createSession(user: User) {
    user.session = await Session.new(user, moment().add(this._sessionHours, 'hours'));
    
    const result = await container.db.query("INSERT INTO `session` SET ?", user.session.toDb());
    user.session.id = result.insertId;
  }
}