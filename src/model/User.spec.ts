import { User } from './User';

describe('User', function() {
  it('displayName', () => {
    const u = new User();
    u.userName = 'c00';
    expect(u.displayName).toEqual('c00');
    u.firstName = "Co";
    expect(u.displayName).toEqual('Co');
    u.lastName = "van Leeuwen";
    expect(u.displayName).toEqual('Co van Leeuwen');
    u.firstName = null;
    expect(u.displayName).toEqual('van Leeuwen');
  }); 

  it('password', () => {
    const u = new User();
    u.userName = 'c00';
    expect(u.passwordHash).toBeNull("Password hash should still be empty!");

    u.setPassword('123');
    expect(u.passwordHash).toBeDefined("Password hash seems empty!");
    expect(u.checkPassword('123')).toEqual(true, "Should be the correct password");
    expect(u.checkPassword('not the password')).toEqual(false, "Wrong password password");
  });
});