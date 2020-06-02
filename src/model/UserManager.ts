import moment from 'moment';
import uuidv4 from 'uuid/v4';

import container from './DiContainer';
import { SqlHelper, getIdentifierType } from './helpers';
import { LoginResult } from './LoginResult';
import { Session } from './Session';
import { User } from './User';
import { Membership } from './Membership';
import { SqlResult } from './SqlResult';
import { iAuthMethod } from './authMethod/iAuthMethod';
import { isNumber } from 'util';
import { SearchCriteria } from './SearchCriteria';
import { UsersPage } from './UsersPage';
import { LoginRequest } from './RequestBody';
import { get2fa, twoFactorType } from './twoFactor/2faHelper';

export class UserManager {
  private _sessionHours: number;

  constructor() {
    this._sessionHours = container.settings.sessionExpires;
  }

  async getUserById(id: number): Promise<User | null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.id = ?";
    const users = await this.processUserQuery(sql, [id]);
    if (users.length === 0) return null;

    return users[0];
  }

  async getUserByConfirmToken(token: string): Promise<User | null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE `u`.`emailConfirmToken` = ?";
    const users = await this.processUserQuery(sql, [token]);
    if (users.length === 0) return null;

    return users[0];
  }

  /**
   * Get a user by either id, uuid, username or email.
   * 
   * The function will figure it out what you've supplied and go from there.
   *
   * @param {*} identifier
   * @returns {(Promise<User|null>)}
   * @memberof UserManager
   */
  async getUser(identifier: any, app?: string): Promise<User | null> {
    if (!identifier) return null;

    const type = getIdentifierType(identifier);
    let user: User;

    if (type === "id") {
      user = await container.um.getUserById(identifier);
    } else if (type === "uuid") {
      user = await container.um.getUserByUuid(identifier);
    } else if (type === "username") {
      user = await container.um.getUserByUsername(identifier);
    } else if (type === "email") {
      user = await container.um.getUserByEmail(identifier);
    }
    
    //Check the App
    if (user && app && !user.hasApp(app)) {
      return null;
    }

    return user;
  }

  async getUsers(search: SearchCriteria): Promise<UsersPage> {

    //Get full count
    const countResults = await container.db.query(search.getSqlBuilder().getSql("SELECT COUNT(DISTINCT u.id) count", false));
    const total = Number(countResults[0].count);

    //Get page Ids
    const idResult = await container.db.query(search.getSqlBuilder().getSql("SELECT DISTINCT u.id"));
    const ids = idResult.map(r => r.id);

    if (ids.length === 0) {
      return {
        criteria: search,
        users: [],
        lastPage: 0,
      }
    }

    //Get users
    const sql = this.userQuery() + "WHERE u.id IN (?)";
    const users = await this.processUserQuery(sql, [ids]);

    const page: UsersPage = {
      criteria: search,
      users,
      lastPage: Math.ceil(total / search.perPage) - 1,
    };

    return page;
  }

  private async getSearchTotals(search: SearchCriteria) {
    let select = "SELECT COUNT(DISTINCT u.id)";

    const builder = search.getSqlBuilder();

    const totalResult = await container.db.query(`${select} ${builder.getFrom()} ${builder.getWhere()} ${builder.getOrderBy()} ${builder.getLimit()}`);

  }

  async getUserByUsername(name: string): Promise<User | null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.username = ?";
    const users = await this.processUserQuery(sql, [name]);
    if (users.length === 0) return null;

    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.email = ?";
    const users = await this.processUserQuery(sql, [email]);
    if (users.length === 0) return null;

    return users[0];
  }

  async getUserByUuid(uuid: string): Promise<User | null> {
    await container.ready();

    const sql = this.userQuery() + "WHERE u.uuid = ?";
    const users = await this.processUserQuery(sql, [uuid]);
    if (users.length === 0) return null;

    return users[0];
  }

  async login(data: LoginRequest, authMethod: any, authOptions: any): Promise<LoginResult> {
    await container.ready();

    const user = await this.getUser(data.username, data.app);
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

    //Two factor Auth needed?
    if (user.twoFactor) {
      const two = get2fa(user.twoFactor);
      const result = await two.request(user);
      return LoginResult.twoFactor(user, result);
    }

    await this.createSession(user, data.sessionHours);

    return LoginResult.success(user);
  }

  async getLast2faToken(user: User, type: twoFactorType) {
    const two = get2fa(type);
    const token = await two.getLatest(user);
    return token;
  }

  async get2faTokens(type: twoFactorType, page: number) {
    const two = get2fa(type);
    const data = await two.getTokens(page);
    return data;
  }

  async verifyTwoFactor(user: User, type: twoFactorType, data: any): Promise<LoginResult> {
    const two = get2fa(type);
    const verified = await two.verify(user, data);
    
    if (!verified) return LoginResult.failed("two-factor-verification-failed");

    //Set as 2-factor method
    if (!user.twoFactor) {
      user.twoFactor = type;
      await this.updateUser(user);
    }

    //2fa by email will also confirm an email address if needed.
    if (type === "email" && !user.emailConfirmed) {
      await this.confirmEmailByUserId(user.id);
    }

    await this.createSession(user, data.sessionHours);

    return LoginResult.success(user);
  }

  async updateUser(user: User): Promise<number> {
    const update = SqlHelper.update('user', user.toDb());
    update.sql += " WHERE id = ?";
    update.values.push(user.id);

    try {
      const result = await container.db.query(update.sql, update.values);
      if (user.active === false) await this.expireAllSessions(user.id);
      return result.affectedRows;
    } catch (err) {
      console.error(err);
      throw "Can't update user.";
    }    

  }

  async purgeUser(uuid: string) {
    const result = await container.db.query("DELETE FROM `user` WHERE `uuid` = ?", [uuid]);
    return (result.affectedRows > 0);
  }

  async activateUser(userId: number, active: boolean) {
    const update = SqlHelper.update('user', { active });
    update.sql += " WHERE id = ?";
    update.values.push(userId);
    const result = await container.db.query(update.sql, update.values);
    if (!active) await this.expireAllSessions(userId);

    return result.affectedRows;
  }

  async addUser(user: User) {
    //Check validity
    if (!user.isValid()) {
      return { success: false, reason: "Username or email is invalid" };
    }
    if (await this.userNameTaken(user.username)) {
      return { success: false, reason: "Username already taken" };
    }
    if (user.email && await this.emailTaken(user.email)) {
      return { success: false, reason: "Email already exists" };
    }

    user.uuid = uuidv4();
    user.created = moment();
    user.lastActivity = moment();

    if (!user.email) user.emailConfirmed = moment();

    if (!user.emailConfirmed) {
      user.emailConfirmToken = uuidv4();
      const expiresHours = container.settings.confirmTokenExpires;
      user.emailConfirmTokenExpires = moment().add(expiresHours, 'hours');
    }

    const result = await container.db.query("INSERT INTO `user` SET ?", user.toDb());
    user.id = result.insertId;

    return { success: true };
  }

  async validateSession(token: string): Promise<Session | null> {
    const now = moment().unix();
    const rows = await container.db.query("SELECT * FROM `session` WHERE `token` = ? AND `expires` > ?", [token, now]);
    if (rows.length === 0) return null;

    const session = Session.fromDb(rows[0]);
    this.touchSession(session);
    return session;
  }

  async expireSession(token: string) {
    const expires = moment().subtract(1, 'second').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `token` = ?", [expires, token]);
  }

  async expireAllSessions(userId: string | number) {
    if (!isNumber(userId)) userId = await this.getIdFromUuid(userId);
    if (!userId) return null;

    const expires = moment().subtract(1, 'second').unix();
    await container.db.query("UPDATE `session` SET `expires` = ? WHERE `userId` = ?", [expires, userId]);
  }

  async addMemberships(userId: number, memberships: Membership | Membership[]) {
    if (!Array.isArray(memberships)) memberships = [memberships];
    if (memberships.length === 0) return;

    const rows = [];
    for (let m of memberships) {
      const row = [m.app, m.role, userId, moment().unix()];
      rows.push(row);
    }

    //note: rows is now an array in an array in an array... Don't know why, but such is life.
    // https://stackoverflow.com/questions/8899802/how-do-i-do-a-bulk-insert-in-mysql-using-node-js
    await container.db.query("INSERT INTO `membership` (app, role, userId, created) VALUES ?", [rows]);
  }

  async updateMembership(m: Membership) {
    await container.db.query("UPDATE `membership` SET ? WHERE id = ?", [m, m.id]);
  }

  async replaceMemberships(userId: number, memberships: Membership[]) {
    const con = await container.db.getConnection();
    await con.beginTransaction();
    
    await con.query("DELETE FROM `membership` WHERE `userId` = ?", userId );

    if (memberships.length > 0){
      const rows = [];
      for (let m of memberships) {
        const row = [m.app, m.role, userId, moment().unix()];
        rows.push(row);
      }
      await con.query("INSERT INTO `membership` (app, role, userId, created) VALUES ?", [rows]);
    }

    await con.commit();
    await con.release();
  }

  async removeMemberships(userId: number, memberships: Membership | Membership[]) {
    if (!Array.isArray(memberships)) memberships = [memberships];
    if (memberships.length === 0) return;

    const con = await container.db.getConnection();
    await con.beginTransaction();
    for (let m of memberships) {
      await con.query("DELETE FROM `membership` WHERE userId = ? AND app = ? AND role = ?", [userId, m.app, m.role]);
    }
    await con.commit();
    con.release();
  }

  async removeApp(userId: number, app: string) {
    await container.db.query("DELETE FROM `membership` WHERE userId = ? AND app = ?", [userId, app]);
  }

  async confirmEmailByUserId(userId: number) {
    const data = {
      emailConfirmed: moment().unix(),
      emailConfirmToken: null,
      emailConfirmTokenExpires: null,
    };

    await container.db.query("UPDATE `user` SET ? WHERE id = ?", [data, userId]);
  }

  async confirmEmail(confirmToken: string): Promise<string | null> {
    const user = await this.getUserByConfirmToken(confirmToken);
    if (!user) return null;

    const data = {
      emailConfirmed: moment().unix(),
      emailConfirmToken: null,
      emailConfirmTokenExpires: null,
    };

    await container.db.query("UPDATE `user` SET ? WHERE emailConfirmToken = ?", [data, confirmToken]);
    return user.uuid;
  }

  async userNameTaken(username: string): Promise<boolean> {
    const result = await container.db.query("SELECT `id` FROM `user` WHERE `username` = ?", [username]);
    return (result.length > 0);
  }

  async emailTaken(email: string): Promise<boolean> {
    const result = await container.db.query("SELECT `id` FROM `user` WHERE `email` = ?", [email]);
    return (result.length > 0);
  }

  async userTaken(username: string, email: string): Promise<boolean> {
    const result = await container.db.query("SELECT `id` FROM `user` WHERE `username` = ? OR `email` = ?", [username, email]);
    return (result.length > 0);
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

  private async createSession(user: User, sessionHours?: number) {
    if (!sessionHours) sessionHours = this._sessionHours;
    user.session = await Session.new(user, moment().add(sessionHours, 'hours'));

    const result = await container.db.query("INSERT INTO `session` SET ?", user.session.toDb());
    user.session.id = result.insertId;
  }

  private async getIdFromUuid(uuid: string): Promise<number | null> {
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