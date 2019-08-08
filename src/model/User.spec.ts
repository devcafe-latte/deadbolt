import { User } from './User';

describe('User', function() {
  it('displayName', function() {
    const u = new User('c00');
    expect(u.displayName).toEqual('c00');
    u.firstName = "Co";
    expect(u.displayName).toEqual('Co');
    u.lastName = "van Leeuwen";
    expect(u.displayName).toEqual('Co van Leeuwen');
    u.firstName = null;
    expect(u.displayName).toEqual('van Leeuwen');
  }); 
});