import { randomBytes } from 'crypto';
import moment, { Moment } from 'moment';
import randomNumber from 'random-number-csprng';

import container from '../DiContainer';
import { Page, PageResult } from '../Page';
import { ObjectMapping, Serializer } from '../Serializer';
import { User } from '../User';
import { twoFactor } from './2faHelper';


export class SmsTwoFactor implements twoFactor {
  type: "sms";

  async setup(u: User) {
    //No need to set it up. 
    return { message: "no setup needed" }; 
  }

  async verify(u: User, data: { token: string, userToken: string }) {
    const rows = await container.db.query("SELECT * FROM `smsTwoFactor` WHERE used = 0 AND userId = ? AND userToken = ? AND expires > ?", [u.id, data.userToken, moment().unix()]);

    if (rows.length !== 1) return false;

    const row: SmsTwoFactorRow = rows[0];
    if (row.attempt >= container.settings.max2faAttempts) return false;

    if (row.token !== data.token) {
      //increase attempt
      row.attempt++;
      await container.db.query("UPDATE `smsTwoFactor` SET attempt = ? WHERE id = ?", [row.attempt, row.id]);
      return false;
    }

    await container.db.query("UPDATE `smsTwoFactor` SET used = 1 WHERE id = ?", [rows[0].id]);
    return true;
  }

  async request(u: User): Promise<SmsTwoFactorRow> {

    const data = new SmsTwoFactorRow();
    data.userId = u.id;
    data.expires = moment().add(10, 'minute');
    data.used = false;
    data.token = await this.getToken();
    data.userToken = randomBytes(16).toString('hex');
    data.attempt = 0;

    const result = await container.db.query("INSERT INTO `smsTwoFactor` SET ?", Serializer.serialize(data))
    data.id = result.insertId;

    return data;
  }

  private async getToken(): Promise<string> {
    return (await randomNumber(100000, 999999)).toString();
  }

  async getLatest(u: User): Promise<SmsTwoFactorRow> {
    const rows = await container.db.query("SELECT * FROM `smsTwoFactor` WHERE userId = ? ORDER BY id DESC LIMIT 1", [u.id]);

    if (rows.length === 0) return null;
    const data = rows[0];

    return SmsTwoFactorRow.deserialize(data);
  }

  async getTokens(page = 0): Promise<Page<SmsTwoFactorRow>> {
    const limit = 25;
    const offset = limit * page;

    const countRow = await container.db.query("SELECT COUNT(id) count FROM `smsTwoFactor`", [limit, offset]);
    const count = countRow[0].count;

    const rows = await container.db.query("SELECT * FROM `smsTwoFactor` ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
    const data: PageResult = {
      currentPage: page,
      totalItems: count,
      items: rows,
      perPage: limit,
    }

    return new Page<SmsTwoFactorRow>(data, SmsTwoFactorRow);
  }

}

export class SmsTwoFactorRow {
  id?: number = null;
  userId: number = null;
  token: string = null;
  expires: Moment = null;
  used: boolean = null;
  userToken: string = null;
  attempt: number = null;

  static deserialize(data) {
    const mapping: ObjectMapping = {
      expires: 'moment',
    };
    let result = Serializer.deserialize<SmsTwoFactorRow>(SmsTwoFactorRow, data, mapping);

    return result;
  }
}