import { User } from '../model/User';

describe('User', function() {
  it('displayName', () => {
    const u = new User();
    u.username = 'c00';
    expect(u.displayName).toEqual('c00');
    u.firstName = "Co";
    expect(u.displayName).toEqual('Co');
    u.lastName = "van Leeuwen";
    expect(u.displayName).toEqual('Co van Leeuwen');
    u.firstName = null;
    expect(u.displayName).toEqual('van Leeuwen');
  }); 

  it('fromdb', () => {
    const row = {
      id: 1,
      uuid: '1234567890',
      username: 'test',
      created: 1565513069,
      lastActivity: 1565513069
    };

    const u = User.fromDb(row);
    expect(u.id).toBe(row.id);
    expect(u.uuid).toBe(row.uuid);
    expect(u.username).toBe(row.username);
    expect(u.created.unix()).toBe(row.created);
    expect(u.lastActivity.unix()).toBe(row.lastActivity);
    expect(u.firstName).toBe(null);
    expect(u.lastName).toBe(null);

  });
});