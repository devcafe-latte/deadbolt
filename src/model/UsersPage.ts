import { SearchCriteria } from './SearchCriteria';
import { User } from './User';

//todo deprecate in favor of Page<User>
export interface UsersPage {
  criteria: SearchCriteria;
  users: User[];
  lastPage: number;
}