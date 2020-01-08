import { SearchCriteria } from './SearchCriteria';
import { User } from './User';

export interface UsersPage {
  criteria: SearchCriteria;
  users: User[];
  lastPage: number;
}