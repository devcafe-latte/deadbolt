import { randomBytes } from 'crypto';
import moment, { Moment } from 'moment';
import { generateSecret, totp } from 'speakeasy';

import container from '../DiContainer';
import { stripComplexTypes, toObject } from '../helpers';
import { User } from '../User';
import { twoFactor } from './2faHelper';

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
    }

    await container.db.query("INSERT INTO `totpTwoFactor` SET ?", secret);

    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(container.settings.otpLabel)}:${encodeURIComponent(u.email || u.username)}?secret=${secret.secret}&issuer=${encodeURIComponent(container.settings.otpIssuer)}`;

    const request = await this.request(u);

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
      window: 1,
    });

    if (!verified) {
      tokenRow.attempt++;
      await container.db.query("UPDATE `totpToken` SET attempt = ? WHERE id = ?", [tokenRow.attempt, tokenRow.id]);
    } else {
      tokenRow.used = true;
      await container.db.query("UPDATE `totpToken` SET used = 1 WHERE id = ?", [tokenRow.id]);
    }

    return verified;
  }

  async request(u: User): Promise<TotpToken> {

    const tfSecret = await this.getSecret(u.id);
    if (!tfSecret) throw "Totp Not set up for user " + u.id;

    const t = new TotpToken();
    t.attempt = 0;
    t.expires = moment().add(10, 'minute');
    t.totpTwoFactorId = tfSecret.id;
    t.userToken = randomBytes(16).toString('hex');
    t.used = false;

    await container.db.query("INSERT INTO `totpToken` SET ?", t.toDb());

    return t;
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
      "JOIN `totpTwoFactor` tf ON t.totpTwoFactorId = t.id", 
      "WHERE t.userToken = ?", 
      "AND tf.userId = ?",
      "AND t.expires > ?",
      "AND t.used = 0",
    ].join('\n'),
      [userToken, userId, moment().unix()]);
    if (rows.length === 0) return null;
    const data = rows[0];

    return TotpToken.fromDb(data);
  }
}

export interface TotpSecret {
  id?: number;
  userId: number;
  secret: string;
}

export class TotpToken {
  id?: number = null;
  totpTwoFactorId: number = null;
  attempt: number = null;
  userToken: string = null;
  expires: Moment = null;
  used: boolean = null;
  secret?: string = null;

  toDb() {
    const obj: any = stripComplexTypes(this);
    if (this.expires) obj.expires = + this.expires.unix();
    obj.used = this.used ? 1 : 0;

    return obj;
  }

  static fromDb(row: any): TotpToken {
    const u = toObject<TotpToken>(TotpToken, row);
    if (row.expires) u.expires = moment.unix(row.expires);
    
    return u;
  }
}