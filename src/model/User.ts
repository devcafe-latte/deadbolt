import { hashSync, compareSync } from 'bcrypt';
import { Session } from './Session';
import { toObject, stripComplexTypes } from './helpers';

export class User {
  id: number = null
  username: string = null;
  passwordHash: string = null;
  firstName?: string = null;
  lastName?: string = null;
  email?: string = null;
  session?: Session = null;
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

  static fromDb(row: any[]): User {
    const u = toObject<User>(User, row);
    return u;
  }

  toDb() {
    return stripComplexTypes(this);
  }
}