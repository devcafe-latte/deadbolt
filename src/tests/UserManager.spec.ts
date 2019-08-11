import container from '../model/DiContainer';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';

describe('UserManager', () => {
  const correct = {
    name: 'Co',
    pass: 'password'
  };
  let th: TestHelper;

  beforeEach(async () => {
    th = await TestHelper.new();
  });  

  it('Update User', async () => {
    const um = container.um;
    const user = new User();
    user.id = 1;
    user.setPassword('password');
    const rowsAffected = await um.updateUser(user);
    expect(rowsAffected).toBe(1);
  }); 

  it('Add User', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    user.setPassword('password');
    await um.addUser(user);
    expect(user.id).toBeGreaterThan(0);
  }); 

  it('Remove User', async () => {
    const um = container.um;
    let user = await um.getUser(1);
    expect(user).toBeTruthy();

    await um.removeUser(1);
    user = await um.getUser(1);
    expect(user).toBeFalsy();
  }); 

  it('Activate user', async () => {
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
    expect(result.user.session.id).toBeDefined();
    expect(result.user.session.token).toBeDefined();
    expect(result.user.session.expires).toBeDefined();
    expect(result.user.session.created).toBeDefined();
    expect(result.user.session.userId).toBeDefined();
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

  it('Inactive user', async () => {
    const um = container.um;
    container.um.activateUser(1, false);

    const result = await um.login(correct.name, correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('User cannot login');
  }); 


  it('Validate Session', async () => {
    const result = await container.um.login(correct.name, correct.pass);

    const token = result.user.session.token;

    const session = await container.um.validateSession(token);
    expect(session).toBeDefined("Valid session, should work.");
    
    const invalidToken = await container.um.validateSession("notavalidtoken");
    expect(invalidToken).toBe(null, "Invalid token. Should return null.");
  }); 

  it('Expire Session', async () => {
    const result = await container.um.login(correct.name, correct.pass);
    const token = result.user.session.token;

    await container.um.expireSession(token);
    const expiredSession = await container.um.validateSession(token);
    expect(expiredSession).toBe(null, "Expired session. Should return null.");
  }); 

  it('Expire All Session', async () => {
    const token1 = (await container.um.login(correct.name, correct.pass)).user.session.token;
    const token2 = (await container.um.login(correct.name, correct.pass)).user.session.token;

    expect(await container.um.validateSession(token1)).toBeTruthy("Should be valid.");
    expect(await container.um.validateSession(token2)).toBeTruthy("Should be valid.");

    await container.um.expireAllSessions(1);
    
    expect(await container.um.validateSession(token1)).toBeFalsy("Should be expired.");
    expect(await container.um.validateSession(token2)).toBeFalsy("Should be expires.");
  }); 


});