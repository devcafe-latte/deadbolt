import { Moment } from 'moment';

export interface Membership {
  id?: number;
  userId?: number;
  created?: Moment;
  app: string;
  role: string;
}