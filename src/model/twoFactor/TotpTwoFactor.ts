import { twoFactor } from './2faHelper';
import { User } from '../User';

export class TotpTwoFactor implements twoFactor {
  type: "totp";

  async setup(u: User) {

  }

  async verify(u: User, data: any) {
    return true;
  }

  async request(u: User) {

  }

}