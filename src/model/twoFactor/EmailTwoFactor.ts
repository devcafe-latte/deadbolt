import { randomBytes } from 'crypto';
import moment, { Moment } from 'moment';
import randomNumber from 'random-number-csprng';

import container from '../DiContainer';
import { stripComplexTypes, toObject } from '../helpers';
import { twoFactorTokenType } from '../Settings';
import { User } from '../User';
import { twoFactor } from './2faHelper';


export class EmailTwoFactor implements twoFactor {
  type: "email";

  async setup(u: User) {
    //No need to set it up. 
    return { message: "no setup needed" }; 
  }

  async verify(u: User, data: { token: string, userToken: string }) {
    const rows = await container.db.query("SELECT * FROM `emailTwoFactor` WHERE used = 0 AND userId = ? AND userToken = ? AND expires > ?", [u.id, data.userToken, moment().unix()]);

    if (rows.length !== 1) return false;

    const row: EmailTwoFactorRow = rows[0];
    if (row.attempt >= container.settings.max2faAttempts) return false;

    if (row.token !== data.token) {
      //increase attempt
      row.attempt++;
      await container.db.query("UPDATE `emailTwoFactor` SET attempt = ? WHERE id = ?", [row.attempt, row.id]);
      return false;
    }

    await container.db.query("UPDATE `emailTwoFactor` SET used = 1 WHERE id = ?", [rows[0].id]);
    return true;
  }

  async request(u: User): Promise<EmailTwoFactorRow> {

    const data = new EmailTwoFactorRow();
    data.userId = u.id;
    data.expires = moment().add(10, 'minute');
    data.used = false;
    data.token = await this.getToken();
    data.userToken = randomBytes(16).toString('hex');
    data.attempt = 0;

    const result = await container.db.query("INSERT INTO `emailTwoFactor` SET ?", data.toDb())
    data.id = result.insertId;

    return data;
  }

  private async getToken(): Promise<string> {
    if (container.settings.emailTwoFactorTokenType === twoFactorTokenType.uuid) return randomBytes(16).toString('hex');

    if (container.settings.emailTwoFactorTokenType === twoFactorTokenType.digits) {
      return (await randomNumber(100000, 999999)).toString();
    }

  }

  async getLatest(u: User): Promise<EmailTwoFactorRow> {
    const rows = await container.db.query("SELECT * FROM `emailTwoFactor` WHERE userId = ? ORDER BY id DESC LIMIT 1", [u.id]);

    if (rows.length === 0) return null;
    const data = rows[0];

    return EmailTwoFactorRow.fromDb(data);
  }

}

export class EmailTwoFactorRow {
  id?: number = null;
  userId: number = null;
  token: string = null;
  expires: Moment = null;
  used: boolean = null;
  userToken: string = null;
  attempt: number = null;

  static fromDb(row): EmailTwoFactorRow {
    const r = toObject<EmailTwoFactorRow>(EmailTwoFactorRow, row);
    if (row.expires) r.expires = moment.unix(row.expires);
    
    return r;
  }

  toDb() {
    const obj: any = stripComplexTypes(this);
    if (this.expires) obj.expires = + this.expires.unix();
    obj.used = this.used ? 1 : 0;

    return obj;
  }
}