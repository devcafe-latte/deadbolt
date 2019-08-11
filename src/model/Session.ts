import { Moment } from 'moment';
import { User } from './User';
import moment from 'moment';
import { randomBytes } from 'crypto';
import { stripComplexTypes, toObject } from './helpers';

export class Session {
  id: number = null;
  userId: number = null;
  created: Moment = null;
  expires: Moment = null;
  token: string = null;

  constructor() { }

  static async new(u: User, expires: Moment): Promise<Session> {
    const s = new Session();
    s.userId = u.id;
    s.created = moment();
    s.expires = expires;
    s.token = randomBytes(16).toString('hex');
    u.session = s;

    return s;
  }


  toDb(): any {
    const obj: any = stripComplexTypes(this);
    if (this.created) obj.created = + this.created.unix();
    if (this.expires) obj.expires = + this.expires.unix();

    return obj;
  }

  static fromDb(row: any): Session {
    const s = toObject<Session>(Session, row);

    if (row.created) s.created = moment.unix(row.created);
    if (row.expires) s.expires = moment.unix(row.expires);
    return s;
  }

}