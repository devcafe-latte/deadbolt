import { User } from '../User';

export interface iAuthMethod {
  
  /**
   * Verify a login.
   * e.g. check the password or validate with the oauth service.
   *
   * @param {User} user
   * @param {*} options
   * @returns {boolean}
   * @memberof iAuthMethod
   */
  verify(user: User, options: any): Promise<boolean>;
}