import container from '../model/DiContainer';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';
import { Membership } from '../model/Membership';
import { PasswordAuth } from '../model/authMethod/PasswordAuth';
import moment from 'moment';
import { SearchCriteria } from '../model/SearchCriteria';
import { LoginRequest } from '../model/RequestBody';
import { get2fa } from '../model/twoFactor/2faHelper';

const correct: LoginRequest = {
  username: 'Co',
  password: 'password'
};

const wrongName: LoginRequest = {
  username: 'Gandalf',
  password: 'password'
};

const wrongPass: LoginRequest = {
  username: 'Co',
  password: 'notreallythepassword'
};

let th: TestHelper;

describe('2fa Tests', () => {

  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it('Login with email 2fa', async (done) => {
    const user = await container.um.getUser("co");
    user.twoFactor = "email";
    await container.um.updateUser(user);

    const result = await container.um.login(correct, PasswordAuth, correct.password);
    expect(result.user).toBeDefined();
    expect(result.user.session).toBeNull();

    expect(result.twoFactorData.type).toBe("email");
    expect(result.twoFactorData.token).toBeDefined();

    const tokenData = { token: result.twoFactorData.token, userToken: result.twoFactorData.userToken };
    const result2 = await container.um.verifyTwoFactor(result.user, result.twoFactorData.type, tokenData);

    expect(result2.success).toBe(true);
    expect(result2.user.session).not.toBeNull();

    done();
  });

  it('Login with preferred totp', async (done) => {
    const user = await container.um.getUser("co");
    user.twoFactor = "email";
    await container.um.updateUser(user);

    let result = await container.um.login(correct, PasswordAuth, correct.password, "totp");
    expect(result.user).toBeDefined();
    expect(result.user.session).toBeNull();
    expect(result.twoFactorData.type).toBe("totp");
    expect(result.twoFactorData.confirmed).toBe(false);
    expect(result.twoFactorData.userToken).toBeDefined();
    expect(result.twoFactorData.secret).toBeDefined();

    result = await container.um.login(correct, PasswordAuth, correct.password, "totp");
    expect(result.user).toBeDefined();
    expect(result.user.session).toBeNull();
    expect(result.twoFactorData.type).toBe("totp");
    expect(result.twoFactorData.confirmed).toBe(false);
    expect(result.twoFactorData.userToken).toBeDefined();
    expect(result.twoFactorData.secret).toBeDefined();

    const totpRequest = get2fa("totp").setup(user);
    await container.db.query("UPDATE totpTwoFactor SET confirmed = 1 WHERE userId = ?", [user.id]);
    result = await container.um.login(correct, PasswordAuth, correct.password, "totp");
    expect(result.user).toBeDefined();
    expect(result.user.session).toBeNull();

    expect(result.twoFactorData.type).toBe("totp");
    expect(result.twoFactorData.userToken).toBeDefined();

    done();
  });

});

describe('User Tests', () => {

  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it('Get User By ID', async (done) => {
    const user = await container.um.getUser(1);
    expect(user).toBeDefined();
    expect(user.id).toBe(1);

    //Check memberships
    expect(user.memberships.length).toBe(2);
    done();
  });

  it('Get User by UUID', async (done) => {
    const user = await container.um.getUser("ee13624b-cf22-4597-adb9-bfa4b16baa71");
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
    done();
  });

  it('Get User by Username', async (done) => {
    const user = await container.um.getUser("Co");
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
    done();
  });

  it('Get User by email', async (done) => {
    const user = await container.um.getUser("jordan@example.com");
    expect(user).toBeDefined();
    expect(user.id).toBe(2);
    done();
  });

  it('Get Users normal', async (done) => {
    const s = new SearchCriteria();

    const page = await container.um.getUsers(s);
    expect(page.lastPage).toBe(0);
    expect(page.items.length).toBe(2);
    done();
  });

  it('Get Users paging', async (done) => {
    const s = new SearchCriteria();
    s.perPage = 1;

    let page = await container.um.getUsers(s);
    expect(page.lastPage).toBe(1);
    expect(page.items.length).toBe(1);
    expect(page.items[0].memberships.length).toBe(2);

    s.page = 1;
    page = await container.um.getUsers(s);
    expect(page.items.length).toBe(1);

    s.page = 2;
    page = await container.um.getUsers(s);
    expect(page.items.length).toBe(0);
    done();
  });

  it('Get Users with search term', async (done) => {
    const s = new SearchCriteria();
    s.q = "jordan";

    let page = await container.um.getUsers(s);
    expect(page.items.length).toBe(1);
    expect(page.items[0].firstName).toBe("Jordan");
    done();
  });

  test('Ordering 1', async () => {
    const s = new SearchCriteria();

    s.orderBy = [{ column: "`u`.`username`", desc: false }];
    let page = await container.um.getUsers(s);
    expect(page.items.length).toBe(2);
    expect(page.items[0].username).toBe("Co");
    expect(page.items[1].username).toBe("Jordan");

    s.orderBy = [{ column: "`u`.`username`", desc: true }];
    page = await container.um.getUsers(s);
    expect(page.items.length).toBe(2);
    expect(page.items[0].username).toBe("Jordan");
    expect(page.items[1].username).toBe("Co");
  });

  test('Ordering 2', async () => {
    const s = new SearchCriteria();

    s.orderBy = [
      { column: "`u`.`lastActivity`", desc: false },
      { column: "`u`.`username`", desc: false }
    ];
    let page = await container.um.getUsers(s);
    expect(page.items.length).toBe(2);
    expect(page.items[0].username).toBe("Co");
    expect(page.items[1].username).toBe("Jordan");

    s.orderBy = [
      { column: "`u`.`lastActivity`", desc: true },
      { column: "`u`.`username`", desc: true }
    ];
    page = await container.um.getUsers(s);
    expect(page.items.length).toBe(2);
    expect(page.items[0].username).toBe("Jordan");
    expect(page.items[1].username).toBe("Co");
  });

  it('Update User 1', async (done) => {
    const um = container.um;
    const user = new User();
    user.id = 1;
    user.firstName = 'Cookie'
    const rowsAffected = await um.updateUser(user);
    expect(rowsAffected).toBe(1);
    done();
  });

  it('Update User to existing email', async (done) => {
    const um = container.um;
    const user = new User();
    user.id = 1;
    user.email = 'jordan@example.com'
    const result = await um.updateUser(user).catch((err) => {
      expect(err).toContain("Can't update user");
      return "error-thrown"
    });

    expect(result).toBe("error-thrown");

    done();
  });

  it('Add User normal', async (done) => {
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
    done();
  });

  it('Add User with 2fa', async (done) => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.twoFactor = "email";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(true);

    expect(user.id).toBeGreaterThan(0);
    expect(user.emailConfirmed).toBe(null);
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmTokenExpires).toBeDefined();

    const gotten = await um.getUser(user.username);
    expect(gotten.twoFactor).toBe("email")
    done();
  });

  it('Add User without email', async (done) => {
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
    done();
  });

  it('Add Same Username twice', async (done) => {
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
    done();
  });

  it('Add Same Email twice', async (done) => {
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
    done();
  });

  it('Incorrect username', async (done) => {
    const um = container.um;
    const user = new User();
    user.username = "Paul@#$%^";
    user.firstName = "Paul";
    user.email = "paul@someplace.com";
    const result = await um.addUser(user);
    expect(result.success).toBe(false);
    done();
  });

  it('Incorrect Email', async (done) => {
    const um = container.um;
    const user = new User();
    user.username = "Paul";
    user.firstName = "Paul";
    user.email = "paul's not an email address";
    const result = await um.addUser(user);
    expect(result.success).toBe(false);
    done();
  });

  it('Remove User', async (done) => {
    const um = container.um;
    let user = await um.getUserById(1);
    expect(user).toBeTruthy();

    const uuid = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    expect(await um.purgeUser(uuid)).toBe(true);
    expect(await um.purgeUser(uuid)).toBe(false);

    user = await um.getUserById(1);
    expect(user).toBeFalsy();
    done();
  });

  it("User exists", async (done) => {
    expect(await container.um.userExists(1)).toBe(true);
    expect(await container.um.userExists(123)).toBe(false);
    done();
  });

  it("Username taken", async (done) => {
    expect(await container.um.userNameTaken("Co")).toBe(true);
    expect(await container.um.userNameTaken("cO")).toBe(true);
    expect(await container.um.userNameTaken("Slagathor")).toBe(false);
    done();
  });

  it("Email taken", async (done) => {
    expect(await container.um.emailTaken("jordan@example.com")).toBe(true);
    expect(await container.um.emailTaken("Slagathor@museumofnecromancy.com")).toBe(false);
    done();
  });

  it("Email or username taken", async (done) => {
    expect(await container.um.userTaken("Co", "jordan@example.com")).toBe(true);
    expect(await container.um.userTaken("Noop noop", "jordan@example.com")).toBe(true);
    expect(await container.um.userTaken("Co", "co@thegiantbucket.com")).toBe(true);
    expect(await container.um.userTaken("Noop noop", "co@thegiantbucket.com")).toBe(false);
    done();
  });

  it('Activate user', async (done) => {
    let user = await container.um.getUserById(1);
    expect(user.active).toBe(true);

    await container.um.activateUser(1, false);
    user = await container.um.getUserById(1);
    expect(user.active).toBe(false);

    await container.um.activateUser(1, true);
    user = await container.um.getUserById(1);
    expect(user.active).toBe(true);
    done();
  });

  it('Logs in', async (done) => {
    const um = container.um;
    const result = await um.login(correct, PasswordAuth, correct.password);

    expect(result.success).toBe(true);
    expect(result.user.displayName).toBe('Co');
    expect(result.user.session).toBeDefined();
    expect(result.user.session.id).toBeDefined();
    expect(result.user.session.token).toBeDefined();
    expect(result.user.session.expires).toBeDefined();
    expect(result.user.session.created).toBeDefined();
    expect(result.user.session.userId).toBeDefined();
    expect(result.user.active).toBe(true);

    expect(result.user.memberships.length).toBe(2);
    done();
  });

  it('Wrong user', async (done) => {
    const um = container.um;
    const result = await um.login(wrongName, PasswordAuth, wrongName.password);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Not found');
    done();
  });

  it('Wrong pasword', async (done) => {
    const um = container.um;
    const result = await um.login(wrongPass, PasswordAuth, wrongPass.password);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Password incorrect');
    done();
  });

  it('Inactive user', async (done) => {
    const um = container.um;
    await container.um.activateUser(1, false);

    const result = await um.login(correct, PasswordAuth, correct.password);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('User cannot login');
    done();
  });

});

describe('Session Tests', () => {
  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it('Variable Expiry time', async (done) => {
    const creds = { ...correct };

    let result = await container.um.login(creds, PasswordAuth, correct.password);
    const normalExpiry = moment().add(container.settings.sessionExpires, 'hours').unix();
    expect(result.user.session.expires.unix()).toBe(normalExpiry);

    creds.sessionHours = 1;
    result = await container.um.login(creds, PasswordAuth, correct.password);
    const shortExpiry = moment().add(creds.sessionHours, 'hours').unix();
    expect(result.user.session.expires.unix()).toBe(shortExpiry);

    done();
  });

  it('Validate Session', async (done) => {
    const result = await container.um.login(correct, PasswordAuth, correct.password);

    const token = result.user.session.token;

    const session = await container.um.validateSession(token);
    expect(session).toBeDefined();

    const invalidToken = await container.um.validateSession("notavalidtoken");
    expect(invalidToken).toBe(null);
    done();
  });

  it('Login With App', async (done) => {
    const creds = { ...correct };
    creds.app = "test-app";
    const result = await container.um.login(creds, PasswordAuth, correct.password);
    expect(result.success).toBe(true);

    creds.app = "wrong-app"
    const result2 = await container.um.login(creds, PasswordAuth, correct.password);
    expect(result2.success).toBe(false);

    done();
  });

  it('Expire Session', async (done) => {
    const result = await container.um.login(correct, PasswordAuth, correct.password);
    const token = result.user.session.token;

    await container.um.expireSession(token);
    const expiredSession = await container.um.validateSession(token);
    expect(expiredSession).toBe(null);
    done();
  });

  it('Expire All Session', async (done) => {
    const token1 = (await container.um.login(correct, PasswordAuth, correct.password)).user.session.token;
    const token2 = (await container.um.login(correct, PasswordAuth, correct.password)).user.session.token;

    expect(await container.um.validateSession(token1)).toBeTruthy();
    expect(await container.um.validateSession(token2)).toBeTruthy();

    await container.um.expireAllSessions(1);

    expect(await container.um.validateSession(token1)).toBeFalsy();
    expect(await container.um.validateSession(token2)).toBeFalsy();
    done();
  });
});

describe('Membership tests', () => {
  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it('adds single membership', async (done) => {
    const membership: Membership = {
      app: 'test-app',
      role: 'admin',
    };
    const userId = 2;

    await container.um.addMemberships(userId, membership);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1);
    expect(user.memberships[0].app).toBe(membership.app);
    expect(user.memberships[0].role).toBe(membership.role);
    expect(user.memberships[0].id).toBeDefined();
    expect(user.memberships[0].userId).toBe(userId);
    done();
  });

  it('Update membership', async (done) => {
    const membership: Membership = {
      id: 2,
      app: 'test-app',
      role: 'Top',
    };
    const userId = 1;

    await container.um.updateMembership(membership);

    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(2);
    expect(user.memberships[1].id).toBe(2);
    expect(user.memberships[1].app).toBe(membership.app);
    expect(user.memberships[1].role).toBe(membership.role);
    done();
  });

  it('adds multiple memberships', async (done) => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(3);
    done();
  });

  it('replaces multiple memberships', async (done) => {

    const initial: Membership[] = [
      { app: 'test-app', role: 'admin', },
    ];
    const newMemberships: Membership[] = [
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, initial);
    let user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1);

    //Replace
    await container.um.replaceMemberships(userId, newMemberships);
    user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(2);
    done();
  });

  it('replaces with 0 memberships', async (done) => {

    const initial: Membership[] = [
      { app: 'test-app', role: 'admin', },
    ];
    const newMemberships: Membership[] = [];
    const userId = 2;

    await container.um.addMemberships(userId, initial);
    let user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1);

    //Replace
    await container.um.replaceMemberships(userId, newMemberships);
    user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(0);
    done();
  });

  it("Removes single membership", async (done) => {
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
    expect(user.memberships.length).toBe(2);

    expect(user.memberships[0].app).toEqual('test-app');
    expect(user.memberships[0].role).toEqual('admin');

    expect(user.memberships[1].app).toEqual('some-other-app');
    expect(user.memberships[1].role).toEqual('newbie');
    done();
  });

  it("Removes multiple memberships", async (done) => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    await container.um.removeMemberships(userId, memberships);
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(0);
    done();
  });

  it("Removes app", async (done) => {
    const memberships: Membership[] = [
      { app: 'test-app', role: 'admin', },
      { app: 'test-app', role: 'user', },
      { app: 'some-other-app', role: 'newbie', }
    ];
    const userId = 2;

    await container.um.addMemberships(userId, memberships);
    await container.um.removeApp(userId, 'test-app');
    const user = await container.um.getUserById(userId);
    expect(user.memberships.length).toBe(1);
    expect(user.memberships[0].app).toEqual('some-other-app');
    expect(user.memberships[0].role).toEqual('newbie');
    done();
  });
});

describe("Email Confirmation Tests", () => {

  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it('confirm Email By Token', async (done) => {
    let user = new User();
    user.username = "Paul";
    user.email = "paul@someplace.com";
    await container.um.addUser(user);

    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBeDefined();
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmed).toBe(null);

    const result = await container.um.confirmEmail(user.emailConfirmToken);
    expect(result).toBe(user.uuid);

    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBe(null);
    expect(user.emailConfirmToken).toBe(null);
    expect(user.emailConfirmed).toBeDefined();
    done();
  });

  it('confirm Email wrong token', async (done) => {
    const result = await container.um.confirmEmail("not a token");
    expect(result).toBeNull();
    done();
  });

  it('confirmEmailByUserId', async (done) => {
    let user = new User();
    user.username = "Paul";
    user.email = "paul@someplace.com";
    await container.um.addUser(user);

    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBeDefined();
    expect(user.emailConfirmToken).toBeDefined();
    expect(user.emailConfirmed).toBe(null);

    await container.um.confirmEmailByUserId(user.id);
    user = await container.um.getUserById(user.id);
    expect(user.emailConfirmTokenExpires).toBe(null);
    expect(user.emailConfirmToken).toBe(null);
    expect(user.emailConfirmed).toBeDefined();
    done();
  });

  it('email not confirmed', async (done) => {
    await container.db.query("UPDATE user SET emailConfirmToken = ?, emailConfirmed = null, emailConfirmTokenExpires = ? WHERE id = ?", ["some-token", moment().subtract(1, 'minute').unix(), 1]);

    const result = await container.um.login(correct, PasswordAuth, correct.password);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Email address not confirmed.');

    //todo confirm and try again
    await container.um.confirmEmailByUserId(1);
    const result2 = await container.um.login(correct, PasswordAuth, correct.password);
    expect(result2.success).toBe(true);
    done();
  });
});