import { randomBytes } from 'crypto';
import moment, { Moment } from 'moment';
import { generateSecret, totp } from 'speakeasy';

import container from '../DiContainer';
import { ObjectMapping, Serializer } from '../Serializer';
import { User } from '../User';
import { twoFactor } from './2faHelper';
import { Page, PageResult } from '../Page';

export class TotpTwoFactor implements twoFactor {
  type: "totp";

  async setup(u: User) {
    //Make sure it doens't exist yet.
    const oldSecret = await this.getSecret(u.id);
    if (oldSecret) await this.reset(u);

    const se = generateSecret();

    const secret: TotpSecret = {
      userId: u.id,
      secret: se.base32,
      confirmed: false,
    }

    await container.db.query("INSERT INTO `totpTwoFactor` SET ?", secret);

    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(container.settings.otpLabel)}:${encodeURIComponent(u.email || u.username)}?secret=${secret.secret}&issuer=${encodeURIComponent(container.settings.otpIssuer)}`;

    const request = await this.newtoken(u, true);

    return {
      ...secret,
      otpAuthUrl,
      userToken: request.userToken,
      expires: request.expires,
    }
  }

  async verify(u: User, data: { token: string, userToken: string }) {
    const tokenRow = await this.getTokenRow(u.id, data.userToken);
    if (!tokenRow) return false;
    if (!data.token) return false;

    if (tokenRow.attempt >= container.settings.max2faAttempts) return false;

    const verified = totp.verify({
      secret: tokenRow.secret,
      encoding: 'base32',
      token: data.token,
      window: container.settings.totpWindow,
    });

    if (!verified) {
      tokenRow.attempt++;
      await container.db.query("UPDATE `totpToken` SET attempt = ? WHERE id = ?", [tokenRow.attempt, tokenRow.id]);
    } else {
      tokenRow.used = true;
      await container.db.query("UPDATE `totpToken` SET used = 1 WHERE id = ?", [tokenRow.id]);
      await container.db.query("UPDATE `totpTwoFactor` SET confirmed = 1 WHERE userId = ?", [u.id]);
    }

    return verified;
  }

  private async newtoken(u: User, force: boolean): Promise<TotpToken> {
    const tfSecret = await this.getSecret(u.id);
    if (!tfSecret) throw "Totp Not set up for user " + u.id;
    if (!force && !tfSecret.confirmed) throw "Totp Not activated for user " + u.id;

    const t = new TotpToken();
    t.attempt = 0;
    t.expires = moment().add(10, 'minute');
    t.totpTwoFactorId = tfSecret.id;
    t.userToken = randomBytes(16).toString('hex');
    t.used = false;

    const tokenData = Serializer.serialize(t)
    delete tokenData.secret;

    await container.db.query("INSERT INTO `totpToken` SET ?", tokenData);

    return t;
  }

  async request(u: User): Promise<TotpToken> {
    return this.newtoken(u, false);
    // const tfSecret = await this.getSecret(u.id);
    // if (!tfSecret || !tfSecret.confirmed) throw "Totp Not set up for user " + u.id;

    // const t = new TotpToken();
    // t.attempt = 0;
    // t.expires = moment().add(10, 'minute');
    // t.totpTwoFactorId = tfSecret.id;
    // t.userToken = randomBytes(16).toString('hex');
    // t.used = false;

    // const tokenData = Serializer.serialize(t)
    // delete tokenData.secret;

    // await container.db.query("INSERT INTO `totpToken` SET ?", tokenData);

    // return t;
  }

  async reset(u: User) {
    await container.db.query("DELETE FROM `totpTwoFactor` WHERE userId = ?", [u.id]);
  }

  private async getSecret(userId: number): Promise<TotpSecret> {
    const rows = await container.db.query("SELECT * FROM `totpTwoFactor` WHERE userId = ?", [userId]);
    if (rows.length === 0) return null;
    return rows[0];
  }

  private async getTokenRow(userId: number, userToken: string): Promise<TotpToken> {
    const rows = await container.db.query([
      "SELECT t.*, tf.secret",
      "FROM `totpToken` t",
      "JOIN `totpTwoFactor` tf ON t.totpTwoFactorId = tf.id",
      "WHERE t.userToken = ?",
      "AND tf.userId = ?",
      "AND t.expires > ?",
      "AND t.used = 0",
    ].join('\n'),
      [userToken, userId, moment().unix()]);
    if (rows.length === 0) return null;
    const data = rows[0];

    return TotpToken.deserialize(data);
  }

  async getLatest(u: User): Promise<TotpToken> {
    const rows = await container.db.query([
      "SELECT t.*",
      "FROM `totpToken` t",
      "JOIN `totpTwoFactor` tf ON t.totpTwoFactorId = tf.id",
      "WHERE tf.userId = ?",
      "ORDER BY `t`.`id` DESC",
      "LIMIT 1"
    ].join('\n'),
      [u.id]);
    if (rows.length === 0) return null;
    const data = rows[0];

    return TotpToken.deserialize(data);
  }

  async getTokens(page = 0): Promise<Page<TotpToken>> {
    const limit = 25;
    const offset = limit * page;

    const countRow = await container.db.query("SELECT COUNT(id) count FROM `totpToken`", [limit, offset]);
    const count = countRow[0].count;

    const rows = await container.db.query("SELECT * FROM `totpToken` ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
    const data: PageResult = {
      currentPage: page,
      totalItems: count,
      items: rows,
      perPage: limit,
    }

    return new Page<TotpToken>(data, TotpToken);
  }
}

export interface TotpSecret {
  id?: number;
  userId: number;
  secret: string;
  confirmed: boolean;
}

export class TotpToken {
  id?: number = null;
  totpTwoFactorId: number = null;
  attempt: number = null;
  userToken: string = null;
  expires: Moment = null;
  used: boolean = null;
  secret?: string = null;

  static deserialize(data) {
    const mapping: ObjectMapping = {
      expires: 'moment',
    };
    let result = Serializer.deserialize<TotpToken>(TotpToken, data, mapping);

    return result;
  }
}