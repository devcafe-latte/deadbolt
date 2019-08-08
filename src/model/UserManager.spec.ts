import { UserManager } from './UserManager';

describe('UserManager', function() {
  const correct = {
    name: 'c00',
    pass: 'password'
  };

  it('Logs in', () => {
    const um = new UserManager();
    const result = um.login(correct.name, correct.pass);
    expect(result.success).toBe(true, "Should log in just fine.");
    expect(result.user.displayName).toBe('Co van Leeuwen');
  }); 

  it('Wrong user', () => {
    const um = new UserManager();
    const result = um.login("Gandalf", correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Not found');
  }); 

  it('Wrong pasword', () => {
    const um = new UserManager();
    const result = um.login(correct.name, 'magic stick');
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Password incorrect');
  }); 


});