import moment from 'moment';
import uuidv4 from 'uuid/v4';

import container from './DiContainer';
import { SqlHelper } from './helpers';
import { LoginResult } from './LoginResult';
import { Session } from './Session';
import { User } from './User';
import { Membership } from './Membership';
import { SqlResult } from './SqlResult';
import { iAuthMethod } from './authMethod/iAuthMethod';
import { isNumber } from 'util';

export class UserManager {
  private _sessionHours: number;

  constructor() {
    //Default to 2 weeks.
    this._sessionHours = Number(process.env.SESSION_HOURS) || 24 * 14;
  }

  public async getUser(id: number): Promise<User|null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.id = ?";
    const users = await this.processUserQuery(sql, [id]);
    if (users.length === 0) return null;

    return users[0];
  }

  public async login(username: string, authMethod: any, authOptions: any): Promise<LoginResult> {
    await container.ready();

    const user = await this.getUserByUsername(username);
    if (!user) return LoginResult.failed("Not found");

    const authService: iAuthMethod = new authMethod();
    const authenticated = await authService.verify(user, authOptions);

    if (!authenticated) {
      return LoginResult.failed("Password incorrect");
    }

    if (!user.active) {
      return LoginResult.failed("User cannot login");
    }

    if (!user.emailConfirmed && user.emailConfirmTokenExpires.isBefore()) {
      return LoginResult.failed("Email address not confirmed.");
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

    if (!user.emailConfirmed) {
      user.emailConfirmToken = uuidv4();
      const expiresHours = process.env.CONFIRM_TOKEN_EXPIRES_HOURS || 24 * 7;
      user.emailConfirmTokenExpires = moment().add(expiresHours, 'hours');
    }
    
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

  public async expireAllSessions(userId: string|number) {
    if (!isNumber(userId)) userId = await this.getIdFromUuid(userId);
    if (!userId) return null;

    const expires = moment().subtract(1, 'second').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `userId` = ?", [expires, userId]);
  }

  public async addMemberships(userId: number, memberships: Membership|Membership[]) {
    if (!Array.isArray(memberships)) memberships = [memberships];
    if (memberships.length === 0) return;

    const rows = [];
    for (let m of memberships) {
      const row = [ m.app, m.role, userId, moment().unix() ];
      rows.push(row);
    }

    //note: rows is now an array in an array in an array... Don't know why, but such is life.
    // https://stackoverflow.com/questions/8899802/how-do-i-do-a-bulk-insert-in-mysql-using-node-js
    await container.db.query("INSERT INTO `membership` (app, role, userId, created) VALUES ?", [rows]);
  }

  public async removeMemberships(userId: number, memberships: Membership|Membership[]) {
    if (!Array.isArray(memberships)) memberships = [memberships];
    if (memberships.length === 0) return;

    const db = container.db;
    await db.beginTransaction();
    for (let m of memberships) {
      await db.query("DELETE FROM `membership` WHERE userId = ? AND app = ? AND role = ?", [userId, m.app, m.role]);
    }
    await db.commit();
  }

  public async removeApp(userId: number, app: string) {
    await container.db.query("DELETE FROM `membership` WHERE userId = ? AND app = ?", [userId, app]);
  }

  public async confirmEmailByUserId(userId: number) {
    const data = {
      emailConfirmed: moment().unix(),
      emailConfirmToken: null,
      emailConfirmTokenExpires: null,
    };

    await container.db.query("UPDATE `user` SET ? WHERE id = ?", [ data, userId ]);
  }

  public async confirmEmail(confirmToken: string) {
    const data = {
      emailConfirmed: moment().unix(),
      emailConfirmToken: null,
      emailConfirmTokenExpires: null,
    };

    await container.db.query("UPDATE `user` SET ? WHERE emailConfirmToken = ?", [ data, confirmToken ]);
  }

  async userExists(userId: number): Promise<boolean> {
    const result = await container.db.query("SELECT `id` FROM `user` WHERE `id` = ?", [userId]);
    return (result.length > 0);
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

  private async getUserByUsername(name: string): Promise<User|null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.username = ?";
    const users = await this.processUserQuery(sql, [name]);
    if (users.length === 0) return null;

    return users[0];
  }

  private async getIdFromUuid(uuid: string): Promise<number|null> {
    const result = await container.db.query("SELECT `id` FROM `user` WHERE `uuid` = ?", [uuid]);
    if (result[0]) return result[0].id;
    return null;
  }
  
  private userQuery() {
    const sql = "SELECT * FROM `user` u " + 
      "LEFT OUTER JOIN `membership` m ON u.id = m.userId ";

      return sql;
  }

  private async processUserQuery(sql: string, values: any): Promise<User[]> {
    const rows = await container.db.query({ sql, values, nestTables: true });
    if (rows.length === 0) return [];
    
    const results = SqlResult.new(rows);
    results.cast('u', User);
    
    const memberships: Membership[] = results.array('m');
    for (let m of memberships) {
      results.data.u[m.userId].memberships.push(m);
    }
    
    return results.array('u');
  }
}