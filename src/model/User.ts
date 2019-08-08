import { hashSync, compareSync } from 'bcrypt';

export class User {
  id: number = null
  userName: string = null;
  passwordHash: string = null;
  firstName?: string = null;
  lastName?: string = null;
  email?: string = null;

  get displayName(): string {
    if (this.lastName || this.firstName){
      const first = this.firstName || '';
      const last = this.lastName || '';
      return `${first} ${last}`.trim();
    }

    return this.userName;
  }

  constructor() { }

  setPassword(value: string) {
    this.passwordHash = hashSync(value, 10);
  }

  checkPassword(pass: string): boolean {
    if (!this.passwordHash) return false;
    return compareSync(pass, this.passwordHash);
  }

}