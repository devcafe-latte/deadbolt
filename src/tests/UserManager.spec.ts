import container from '../model/DiContainer';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';
import { Membership } from '../model/Membership';
import { PasswordAuth } from '../model/authMethod/PasswordAuth';
import moment from 'moment';

const correct = {
  name: 'Co',
  pass: 'password'
};
let th: TestHelper;

describe('User Tests', () => {  

  beforeEach(async () => {
    th = await TestHelper.new();
  });

  it('Get User By ID', async () => {
    const user = await container.um.getUser(1);
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  }); 

  it('Get User by UUID', async () => {
    const user = await container.um.getUser("ee13624b-cf22-4597-adb9-bfa4b16baa71");
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  }); 

  it('Get User by Username', async () => {
    const user = await container.um.getUser("Co");
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  }); 

  it('Get User by email', async () => {
    const user = await container.um.getUser("jordan@example.com");
    expect(user).toBeDefined();
    expect(user.id).toBe(2);
  }); 

  it('Update User', async () => {
    const um = container.um;
    const user = new User();
    user.id = 1;
    user.firstName = 'Cookie'
    const rowsAffected = await um.updateUser(user);
    expect(rowsAffected).toBe(1);
  }); 

  it('Add User', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(true);

    expect(user.id).toBeGreaterThan(0);
    expect(user.emailConfirmed).toBe(null);
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmTokenExpires).toBeDefined();    
  }); 

  it('Add User without email', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    const result = await um.addUser(user);
    expect(result.success).toBe(true);

    expect(user.id).toBeGreaterThan(0);
    expect(user.emailConfirmed).toBeDefined;
    expect(user.emailConfirmToken).toBe(null);
    expect(user.emailConfirmTokenExpires).toBe(null);    
  }); 

  it('Add Same Username twice', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(true);

    expect(user.id).toBeDefined();
    user.id = null;
    user.email = "Something@else.com";

    const result2 = await um.addUser(user);
    expect(result2.success).toBe(false);
  }); 

  it('Add Same Email twice', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(true);

    expect(user.id).toBeDefined();
    user.id = null;
    user.username = "Something else";

    const result2 = await um.addUser(user);
    expect(result2.success).toBe(false);
  }); 

  it('Incorrect username', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul@#$%^";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(false);
  }); 

  it('Incorrect Email', async () => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul's not an email address";
    const result = await um.addUser(user);
    expect(result.success).toBe(false);
  }); 

  it('Remove User', async () => {
    const um = container.um;
    let user = await um.getUserById(1);
    expect(user).toBeTruthy();

    const uuid = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    expect(await um.purgeUser(uuid)).toBe(true);
    expect(await um.purgeUser(uuid)).toBe(false, "It's already gone.");

    user = await um.getUserById(1);
    expect(user).toBeFalsy();
  }); 

  it("User exists", async () => {
    expectAsync(container.um.userExists(1)).toBeResolvedTo(true);
    expectAsync(container.um.userExists(123)).toBeResolvedTo(false);
  });

  it("Username taken", async () => {
    expectAsync(container.um.userNameTaken("Co")).toBeResolvedTo(true);
    expectAsync(container.um.userNameTaken("cO")).toBeResolvedTo(true);
    expectAsync(container.um.userNameTaken("Slagathor")).toBeResolvedTo(false);
  });

  it("Email taken", async () => {
    expectAsync(container.um.userNameTaken("jordan@example.com")).toBeResolvedTo(true);
    expectAsync(container.um.userNameTaken("Slagathor@museumofnecromancy.com")).toBeResolvedTo(false);
  });

  it("Email or username taken", async () => {
    expectAsync(container.um.userTaken("Co", "jordan@example.com")).toBeResolvedTo(true);
    expectAsync(container.um.userTaken("Noop noop", "jordan@example.com")).toBeResolvedTo(true);
    expectAsync(container.um.userTaken("Co", "co@thegiantbucket.com")).toBeResolvedTo(true);
    
    expectAsync(container.um.userTaken("Noop noop", "co@thegiantbucket.com")).toBeResolvedTo(false);
  });

  it('Activate user', async () => {
    let user = await container.um.getUserById(1);
    expect(user.active).toBe(true);

    container.um.activateUser(1, false);
    user = await container.um.getUserById(1);
    expect(user.active).toBe(false);

    container.um.activateUser(1, true);
    user = await container.um.getUserById(1);
    expect(user.active).toBe(true);
    
  }); 

  it('Logs in', async () => {
    const um = container.um;
    const result = await um.login(correct.name, PasswordAuth, correct.pass);

    expect(result.success).toBe(true, "Should log in just fine.");
    expect(result.user.displayName).toBe('Co');
    expect(result.user.session).toBeDefined();
    expect(result.user.session.id).toBeDefined();
    expect(result.user.session.token).toBeDefined();
    expect(result.user.session.expires).toBeDefined();
    expect(result.user.session.created).toBeDefined();
    expect(result.user.session.userId).toBeDefined();
    expect(result.user.active).toBe(true);

    expect(result.user.memberships.length).toBe(2);
  }); 

  it('Wrong user', async () => {
    const um = container.um;
    const result = await um.login("Gandalf", PasswordAuth, correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Not found');
  }); 

  it('Wrong pasword', async () => {
    const um = container.um;
    const result = await um.login(correct.name, PasswordAuth, 'magic stick');
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Password incorrect');
  }); 

  it('Inactive user', async () => {
    const um = container.um;
    container.um.activateUser(1, false);

    const result = await um.login(correct.name, PasswordAuth, correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('User cannot login');
  }); 

});

describe('Session Tests', () => {
  beforeEach(async () => {
    th = await TestHelper.new();
  });

  it('Validate Session', async () => {
    const result = await container.um.login(correct.name, PasswordAuth, correct.pass);

    const token = result.user.session.token;

    const session = await container.um.validateSession(token);
    expect(session).toBeDefined("Valid session, should work.");
    
    const invalidToken = await container.um.validateSession("notavalidtoken");
    expect(invalidToken).toBe(null, "Invalid token. Should return null.");
  }); 

  it('Expire Session', async () => {
    const result = await container.um.login(correct.name, PasswordAuth, correct.pass);
    const token = result.user.session.token;

    await container.um.expireSession(token);
    const expiredSession = await container.um.validateSession(token);
    expect(expiredSession).toBe(null, "Expired session. Should return null.");
  }); 

  it('Expire All Session', async () => {
    const token1 = (await container.um.login(correct.name, PasswordAuth, correct.pass)).user.session.token;
    const token2 = (await container.um.login(correct.name, PasswordAuth, correct.pass)).user.session.token;

    expect(await container.um.validateSession(token1)).toBeTruthy("Should be valid.");
    expect(await container.um.validateSession(token2)).toBeTruthy("Should be valid.");

    await container.um.expireAllSessions(1);
    
    expect(await container.um.validateSession(token1)).toBeFalsy("Should be expired.");
    expect(await container.um.validateSession(token2)).toBeFalsy("Should be expires.");
  }); 
});

describe('Membership tests', () => {
  beforeEach(async () => {
    th = await TestHelper.new();
  });

  it('adds single membership', async () => {
    const membership: Membership = {
      app: 'test-app',
      role: 'admin',
    };
    const userId = 2;

    await container.um.addMemberships(userId, membership);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1, "Should have a membership now");
    expect(user.memberships[0].app).toBe(membership.app);
    expect(user.memberships[0].role).toBe(membership.role);
    expect(user.memberships[0].id).toBeDefined();
    expect(user.memberships[0].userId).toBe(userId);
  });

  it('Update membership', async () => {
    const membership: Membership = {
      id: 2,
      app: 'test-app',
      role: 'Top',
    };
    const userId = 1;

    await container.um.updateMembership(membership);
    
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(2, "Should have a memberships still");
    expect(user.memberships[1].id).toBe(2, "Get the right membershipt");
    expect(user.memberships[1].app).toBe(membership.app);
    expect(user.memberships[1].role).toBe(membership.role);
  });

  it('adds multiple memberships', async () => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(3, "Should have 3 memberships now");
  });

  it ("Removes single membership", async () => {
    const toAdd: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];

    const toRemove: Membership = { app: 'test-app', role: 'user', };
    const userId = 2;

    await container.um.addMemberships(userId, toAdd);
    await container.um.removeMemberships(userId, toRemove);


    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(2, "Should have 2 memberships now");
    
    expect(user.memberships[0].app).toEqual('test-app');
    expect(user.memberships[0].role).toEqual('admin');

    expect(user.memberships[1].app).toEqual('some-other-app');
    expect(user.memberships[1].role).toEqual('newbie');

  });

  it ("Removes multiple memberships", async () => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    await container.um.removeMemberships(userId, memberships);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(0, "All memberships are gone.");
  });

  it ("Removes app", async () => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    await container.um.removeApp(userId, 'test-app');
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1, "Should have one left.");
    expect(user.memberships[0].app).toEqual('some-other-app');
    expect(user.memberships[0].role).toEqual('newbie');
    
  });
});

describe("Email Confirmation Tests", () => {

  beforeEach(async () => {
    th = await TestHelper.new();
  });

  it('confirm Email By Token', async () => {
    let user = new User();
    user.username = "Paul";
    user.email = "paul@someplace.com";
    await container.um.addUser(user);

    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBeDefined();
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmed).toBe(null);

    container.um.confirmEmail(user.emailConfirmToken);
    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBe(null);
    expect(user.emailConfirmToken).toBe(null);
    expect(user.emailConfirmed).toBeDefined();

  });

  it('confirmEmailByUserId', async () => {
    let user = new User();
    user.username = "Paul";
    user.email = "paul@someplace.com";
    await container.um.addUser(user);

    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBeDefined();
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmed).toBe(null);

    container.um.confirmEmailByUserId(user.id);
    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBe(null);
    expect(user.emailConfirmToken).toBe(null);
    expect(user.emailConfirmed).toBeDefined();
  });

  it('email not confirmed', async () => {
    await container.db.query("UPDATE user SET emailConfirmToken = ?, emailConfirmed = null, emailConfirmTokenExpires = ? WHERE id = ?", ["some-token", moment().subtract(1, 'minute').unix(), 1]);

    const result = await container.um.login(correct.name, PasswordAuth, correct.pass);
    expect(result.success).toBe(false, "Should not log in");
    expect(result.reason).toBe('Email address not confirmed.');

    //todo confirm and try again
    container.um.confirmEmailByUserId(1);
    const result2 = await container.um.login(correct.name, PasswordAuth, correct.pass);
    expect(result2.success).toBe(true, "Now it's confirmed.");
  }); 
});