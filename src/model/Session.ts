import { Moment } from 'moment';
import { User } from './User';
import moment from 'moment';

export class Session {
  id: number;
  userId: number;
  created: Moment;
  expires: Moment;

  constructor() {}

  static new(u: User): Session {
    const s = new Session();
    s.userId = u.id;
    s.created = moment();
    s.expires = moment().add(7, 'days');

    u.session = s;
    
    return s;

  }

}