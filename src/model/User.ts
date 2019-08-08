export class User {
  id: number
  firstName?: string;
  lastName?: string;
  email?: string;

  constructor( public userName: string ) {

  }

  get displayName(): string {
    if (this.lastName || this.firstName){
      const first = this.firstName || '';
      const last = this.lastName || '';
      return `${first} ${last}`.trim();
    }

    return this.userName;
  }
}