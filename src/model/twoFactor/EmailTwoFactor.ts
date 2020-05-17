import { twoFactor } from './2faHelper';
import { User } from '../User';
import container from '../DiContainer';
import moment from 'moment';
import { Moment } from 'moment';
import uuidv4 from 'uuid/v4';
import { stripComplexTypes } from '../helpers';
import { twoFactorTokenType } from '../Settings';
import randomNumber from "random-number-csprng";


export class EmailTwoFactor implements twoFactor {
  type: "email";

  async setup(u: User) {
    //No need to set it up. 
    return { message: "no setup needed" }; 
  }

  async verify(u: User, data: { token: string }) {
    const rows = await container.db.query("SELECT id FROM `emailTwoFactor` WHERE used = 0 AND userId = ? AND token = ? AND expires > ?", [u.id, data.token, moment().unix()]);

    if (rows.length !== 1) return false;

    await container.db.query("UPDATE `emailTwoFactor` SET used = 1 WHERE id = ?", [rows[0].id]);

    return true;
  }

  async request(u: User): Promise<EmailTwoFactorRow> {

    const data = new EmailTwoFactorRow();
    data.userId = u.id;
    data.expires = moment().add(10, 'minute');
    data.used = false;
    data.token = await this.getToken();

    const result = await container.db.query("INSERT INTO `emailTwoFactor` SET ?", data.toDb())
    data.id = result.insertId;

    return data;
  }

  private async getToken(): Promise<string> {
    if (container.settings.emailTwoFactorTokenType === twoFactorTokenType.uuid) return uuidv4();

    if (container.settings.emailTwoFactorTokenType === twoFactorTokenType.digits) {
      return (await randomNumber(100000, 999999)).toString();
    }

  }

}

export class EmailTwoFactorRow {
  id?: number = null;
  userId: number = null;
  token: string = null;
  expires: Moment = null;
  used: boolean = null;

  toDb() {
    const obj: any = stripComplexTypes(this);
    if (this.expires) obj.expires = + this.expires.unix();
    obj.used = this.used ? 1 : 0;

    return obj;
  }
}