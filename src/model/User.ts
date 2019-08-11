import { hashSync, compareSync } from 'bcrypt';
import { Session } from './Session';
import { toObject, stripComplexTypes } from './helpers';
import { Moment } from 'moment';
import moment from 'moment';

export class User {
  id: number = null;
  uuid: string = null;
  username: string = null;
  passwordHash: string = null;
  firstName?: string = null;
  lastName?: string = null;
  email?: string = null;
  session?: Session = null;
  created: Moment = null;
  lastActivity: Moment = null;
  active: Boolean = null;


  get displayName(): string {
    if (this.lastName || this.firstName){
      const first = this.firstName || '';
      const last = this.lastName || '';
      return `${first} ${last}`.trim();
    }

    return this.username;
  }

  constructor() { }

  setPassword(value: string) {
    this.passwordHash = hashSync(value, 10);
  }

  checkPassword(pass: string): boolean {
    if (!this.passwordHash) return false;
    return compareSync(pass, this.passwordHash);
  }


  toDb(): any {
    const obj: any = stripComplexTypes(this);
    if (this.created) obj.created = + this.created.unix();
    if (this.lastActivity) obj.lastActivity = + this.lastActivity.unix();
    
    return obj;
  }

  static fromDb(row: any): User {
    const u = toObject<User>(User, row);
    if (row.created) u.created = moment.unix(row.created);
    if (row.lastActivity) u.lastActivity = moment.unix(row.lastActivity);

    return u;
  }
}