import container from './DiContainer';
import { User } from './User';

describe('UserManager', function() {
  const correct = {
    name: 'Co',
    pass: 'password'
  };

  it('Update User', async () => {
    await container.ready();
    const um = container.um;
    const user = new User();
    user.id = 1;
    user.setPassword('password');
    const rowsAffected = await um.updateUser(user);
    expect(rowsAffected).toBe(1);
  }); 

  it('Activate user', async () => {
    await container.ready();

    let user = await container.um.getUser(1);
    expect(user.active).toBe(true);

    container.um.activateUser(1, false);
    user = await container.um.getUser(1);
    expect(user.active).toBe(false);

    container.um.activateUser(1, true);
    user = await container.um.getUser(1);
    expect(user.active).toBe(true);
    
  }); 

  it('Logs in', async () => {
    const um = container.um;
    const result = await um.login(correct.name, correct.pass);
    expect(result.success).toBe(true, "Should log in just fine.");
    expect(result.user.displayName).toBe('Co');
    expect(result.user.session).toBeDefined();
    expect(result.user.active).toBe(true);
  }); 

  it('Wrong user', async () => {
    const um = container.um;
    const result = await um.login("Gandalf", correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Not found');
  }); 

  it('Wrong pasword', async () => {
    const um = container.um;
    const result = await um.login(correct.name, 'magic stick');
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Password incorrect');
  }); 


});