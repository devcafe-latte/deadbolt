import moment, { Moment } from 'moment';

import { stripComplexTypes, toObject, isValidEmail } from './helpers';
import { Membership } from './Membership';
import { Session } from './Session';
import { twoFactorType } from './twoFactor/2faHelper';

export class User {
  id: number = null;
  uuid: string = null;
  username: string = null;
  firstName?: string = null;
  lastName?: string = null;
  email?: string = null;
  emailConfirmed?: Moment = null;
  emailConfirmToken?: string = null;
  emailConfirmTokenExpires?: Moment = null;
  session?: Session = null;
  created: Moment = null;
  lastActivity: Moment = null;
  active: Boolean = null;
  memberships: Membership[] = [];
  twoFactor: twoFactorType = null;
  //todo add phone number

  get displayName(): string {
    if (this.lastName || this.firstName){
      const first = this.firstName || '';
      const last = this.lastName || '';
      return `${first} ${last}`.trim();
    }

    return this.username;
  }

  constructor() { }

  hasRole(role: string): boolean {
    return Boolean(this.memberships.find(m => m.role === role));
  }

  hasApp(app: string): boolean {
    return Boolean(this.memberships.find(m => m.app === app));
  }

  isValid(): boolean {
    if (!this.username) return false;
    if (!/^[a-z0-9]+$/i.test(this.username)) return false;
    if (this.email && !isValidEmail(this.email)) return false;

    return true;
  }

  toDb(): any {
    const obj: any = stripComplexTypes(this);
    if (this.created) obj.created = + this.created.unix();
    if (this.lastActivity) obj.lastActivity = + this.lastActivity.unix();
    if (this.emailConfirmed) obj.emailConfirmed = + this.emailConfirmed.unix();
    if (this.emailConfirmTokenExpires) obj.emailConfirmTokenExpires = + this.emailConfirmTokenExpires.unix();
    
    return obj;
  }

  static fromDb(row: any): User {
    const u = toObject<User>(User, row);
    if (row.created) u.created = moment.unix(row.created);
    if (row.lastActivity) u.lastActivity = moment.unix(row.lastActivity);
    if (row.emailConfirmed) u.emailConfirmed = moment.unix(row.emailConfirmed);
    if (row.emailConfirmTokenExpires) u.emailConfirmTokenExpires = moment.unix(row.emailConfirmTokenExpires);
    
    return u;
  }
}