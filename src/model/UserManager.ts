import moment from 'moment';
import { isNumber } from 'util';
import uuidv4 from 'uuid/v4';

import { iAuthMethod } from './authMethod/iAuthMethod';
import container from './DiContainer';
import { getIdentifierType, SqlHelper } from './helpers';
import { LoginResult } from './LoginResult';
import { Membership } from './Membership';
import { Page } from './Page';
import { LoginRequest } from './RequestBody';
import { OrderByCriteria, SearchCriteria } from './SearchCriteria';
import { Session } from './Session';
import { get2fa, twoFactorType } from './twoFactor/2faHelper';
import { User } from './User';

export class UserManager {
  private _sessionHours: number;

  constructor() {
    this._sessionHours = container.settings.sessionExpires;
  }

  async getUserById(id: number): Promise<User | null> {
    const users = await this.getUsersByIds([id]);
    return users[0] || null;
  }

  async getUserByConfirmToken(token: string): Promise<User | null> {
    await container.ready();

    const sql = [
      "SELECT * FROM `user` u",
      "LEFT JOIN `membership` m on `m`.`userId` = `u`.`id`",
      "WHERE `u`.`emailConfirmToken` = ?"
    ];

    const results = await container.db.getObjects({ sql: sql.join("\n"), values: [token] }, { u: User });
    results.put('m').into('u', 'memberships').on("userId");

    return results.get<User>('u')[0] || null;
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

    const type = "u." + getIdentifierType(identifier);

    const sql = [
      "SELECT * FROM `user` u",
      "LEFT JOIN `membership` m on `m`.`userId` = `u`.`id`",
      "WHERE ?? = ?"
    ];

    const results = await container.db.getObjects({ sql: sql.join("\n"), values: [type, identifier] }, { u: User });
    results.put('m').into('u', 'memberships').on("userId");

    const user = results.get<User>('u')[0] || null;

    if (user && app && !user.hasApp(app)) {
      return null;
    }

    return user;
  }

  async getUsers(search: SearchCriteria): Promise<Page<User>> {

    //Create base SQL
    const sql = [
      "FROM `user` u",
      "LEFT JOIN `membership` m on `m`.`userId` = `u`.`id`",
      "WHERE 1 = 1"
    ];
    const values = [];

    if (search.q) {
      //q applies to email, firstname and lastname
      sql.push(
        "AND (`u`.`email` LIKE ?",
        "OR `u`.`firstName` LIKE ?",
        "OR `u`.`lastName` LIKE ?)",
      );
      const v = search.q + '%';
      values.push(v, v, v);
    } else if (search.email) {
      sql.push("AND `u`.`email` LIKE ?");
      values.push(search.email + '%');
    }

    if (search.uuids && search.uuids.length > 0) {
      sql.push("AND `u`.`uuid` IN (?)");
      values.push(search.uuids);
    }

    if (search.memberships && search.memberships.length > 0) {
      const msWhere = [];
      for (let m of search.memberships) {
        msWhere.push('(`m`.`app` = ? AND `m`.`role` = ?)');
        values.push(m.app, m.role);
      }
      sql.push('AND (' + msWhere.join(' OR ') + ')');
    }

    //Get total
    const total = await container.db.getValue("SELECT COUNT(DISTINCT `u`.`id`) " + sql.join("\n"), values);

    sql.push("GROUP BY `u`.`id`");

    if (search.orderBy && search.orderBy.length > 0) {
      const ordering = search.orderBy.map(o => `${o.column} ${o.desc ? 'DESC' : ''}`);
      sql.push("ORDER BY ", ordering.join(", "));
    }
    

    const offset = search.perPage * search.page;
    const ids = await container.db.getValues("SELECT `u`.`id` " + sql.join("\n") + " LIMIT ? OFFSET ?", [...values, search.perPage, offset]);

    const users = await this.getUsersByIds(ids, search.orderBy);

    return new Page<User>({
      perPage: search.perPage,
      items: users,
      currentPage: search.page,
      totalItems: total
    });
  }

  private async getUsersByIds(ids: number[], order?: OrderByCriteria[]): Promise<User[]> {
    await container.ready();

    if (ids.length === 0) return [];

    const sql = [
      "SELECT * FROM `user` u",
      "LEFT JOIN `membership` m on `m`.`userId` = `u`.`id`",
      "WHERE `u`.`id` IN (?)"
    ];

    if (order && order.length > 0) {
      const ordering = order.map(o => `${o.column} ${o.desc ? 'DESC' : ''}`);
      sql.push("ORDER BY ", ordering.join(", "));
    }

    const results = await container.db.getObjects({ sql: sql.join("\n"), values: [ids] }, { u: User });
    results.put('m').into('u', 'memberships').on("userId");

    return results.get('u');
  }

  async getUserByUsername(name: string): Promise<User | null> {
    return this.getUser(name);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.getUser(email);
  }

  async getUserByUuid(uuid: string): Promise<User | null> {
    return this.getUser(uuid);
  }

  async login(data: LoginRequest, authMethod: any, authOptions: any, twoFactorType?: twoFactorType): Promise<LoginResult> {
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
    if (twoFactorType || user.twoFactor) {
      const result = await this.tryRequest2fa(user, twoFactorType || user.twoFactor);
      return LoginResult.twoFactor(user, result);
    }

    await this.createSession(user, data.sessionHours);

    return LoginResult.success(user);
  }

  private async tryRequest2fa(user: User, type: twoFactorType) {
    const two = get2fa(type);
    user.twoFactor = type;
    try {
      return await two.request(user);
    } catch (err) {
      return await two.setup(user);
    }
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

  private async getUuid() {

    //Check if it's actually unique.
    let uuid: string;
    let unique = false;
    let i = 0;
    do {
      uuid = uuidv4();
      const result = await container.db.query("SELECT `id` FROM `user` WHERE `uuid` = ?", [uuid]);
      unique = result.length === 0;
      i++;
      if (i > 1000) throw "Can't get UUID?!";
    } while (!unique);

    return uuid;
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

    user.uuid = await this.getUuid();
    user.created = moment();
    user.lastActivity = moment();

    if (!user.email) user.emailConfirmed = moment();

    if (!user.emailConfirmed) {
      user.emailConfirmToken = uuidv4();
      const expiresHours = container.settings.confirmTokenExpires;
      user.emailConfirmTokenExpires = moment().add(expiresHours, 'hours');
    }

    try {
      const result = await container.db.query("INSERT INTO `user` SET ?", user.toDb());
      user.id = result.insertId;
      return { success: true };
    } catch (err) {
      console.log("Can't insert user", user.email, err);
      return { success: false, reason: "Other error" };
    }

  }

  async validateSession(token: string): Promise<Session | null> {
    const now = moment().unix();
    const rows = await container.db.query("SELECT * FROM `session` WHERE `token` = ? AND `expires` > ?", [token, now]);
    if (rows.length === 0) return null;

    const session = Session.fromDb(rows[0]);
    await this.touchSession(session);
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
    const tran = await container.db.getTransaction()

    await tran.query("DELETE FROM `membership` WHERE `userId` = ?", userId);

    if (memberships.length > 0) {
      const rows = [];
      for (let m of memberships) {
        const row = [m.app, m.role, userId, moment().unix()];
        rows.push(row);
      }
      await tran.query("INSERT INTO `membership` (app, role, userId, created) VALUES ?", [rows]);
    }

    await tran.commit();
  }

  async removeMemberships(userId: number, memberships: Membership | Membership[]) {
    if (!Array.isArray(memberships)) memberships = [memberships];
    if (memberships.length === 0) return;

    const tran = await container.db.getTransaction()

    for (let m of memberships) {
      await tran.query("DELETE FROM `membership` WHERE userId = ? AND app = ? AND role = ?", [userId, m.app, m.role]);
    }
    await tran.commit();
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

}