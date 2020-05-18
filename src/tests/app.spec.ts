import moment from 'moment';
import request from 'supertest';

import { PasswordAuth } from '../model/authMethod/PasswordAuth';
import { deadbolt } from '../model/DeadboltApi';
import container from '../model/DiContainer';
import { Membership } from '../model/Membership';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';
import { LoginRequest } from '../model/RequestBody';
import { totp } from 'speakeasy';

TestHelper.setTestEnv();
let app: Express.Application;

const correct: LoginRequest = {
  username: "co",
  password: "password"
};


describe("App", () => {

  beforeEach(async (done) => {
    app = deadbolt.app;
    await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await container.shutdown();
    done();
  });

  it("tests", async (done) => {
    const result = await request(app).get("/")
      .expect(200);
    const body = result.body;
    expect(body.database).toBe("ok");
    expect(body.express).toBe("ok");
    expect(body.status).toBe("ok");
    done();
  });

  it("Checks 404", async (done) => {
    const result = await request(app).get("/not-a-real-url")
      .expect(404);
      done();
  });
});

describe("Sessions", () => {
  beforeEach(async (done) => {
    app = deadbolt.app;
    await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await container.shutdown();
    done();
  });

  it("New Session 2fa", async (done) => {

    const user = await container.um.getUser("co");
    user.twoFactor = "email";
    await container.um.updateUser(user);

    const result = await request(app)
      .post('/session')
      .send({ username: 'Co', password: "password" })
      .expect(200);

    const body = result.body;
    expect(body.user.session).toBeNull();
    expect(body.twoFactorData.type).toBe("email");
    expect(body.twoFactorData.token.length).toBe(6);

    const token = body.twoFactorData.token;
    const result2 = await request(app)
      .post('/verify-2fa')
      .send({ username: 'Co', type: 'email', data: { token } })
      .expect(200);

    const body2 = result2.body;
    expect(body2.user.session.token).toBeDefined();

    done();
  });

  it("Setup Email 2fa", async (done) => {
    const result = await request(app)
      .post('/setup-2fa')
      .send({ username: 'Co', type: "email" })
      .expect(200);

    const body = result.body;
    expect(body.data.message).toContain("no setup needed");

    done();
  });

  it("Setup TOTP 2fa", async (done) => {
    const result = await request(app)
      .post('/setup-2fa')
      .send({ username: 'Co', type: "totp" })
      .expect(200);

    const body = result.body;
    expect(body.data.secret.length).toBe(52);
    expect(body.data.otpAuthUrl).toBeDefined();

    //Create a token
    const secret = body.data.secret;
    const token = totp({
      secret: secret,
      encoding: 'base32'
    });

    const result2 = await request(app)
      .post('/verify-2fa')
      .send({ username: 'Co', type: 'totp', data: { token } })
      .expect(200);

    const body2 = result2.body;
    expect(body2.user.session.token).toBeDefined();

    done();
  });

  it("New Session", async (done) => {
    const result = await request(app)
      .post('/session')
      .send({ username: 'Co', password: "password" })
      .expect(200);

    const body = result.body;
    expect(body.user.session.token).toBeDefined();

    done();
  });

  it("New Session with App", async (done) => {
    const result = await request(app)
      .post('/session')
      .send({ username: 'Co', password: "password", app: 'test-app' })
      .expect(200);

    const user = result.body.user;
    expect(user.session.token).toBeDefined();

    done();
  });

  it("New Session with Wrong App", async (done) => {
    const result = await request(app)
      .post('/session')
      .send({ username: 'Co', password: "password", app: 'wrong-app' })
      .expect(422);

    done();
    done();
  });

  it("Wrong password", async (done) => {
    await request(app)
      .post('/session')
      .send({ username: 'Co', password: "notapassword" })
      .expect(422);
      done();
  });

  it("Wrong username", async (done) => {
    await request(app)
      .post('/session')
      .send({ username: 'Spongebob', password: "notapassword" })
      .expect(422);
      done();
  });

  it("Login missing arguments", async (done) => {
    await request(app)
      .post('/session')
      .send({ password: "notapassword" })
      .expect(400);
      done();
  });

  it("Check session", async (done) => {
    const login = await container.um.login(correct, PasswordAuth, "password");
    const user = login.user;

    expect(user.session.token).toBeDefined("Session token should be here");

    const checkResult = await request(app).get(`/session/${user.session.token}`).expect(200);

    //Check body
    expect(checkResult.body.created).toBeDefined();
    expect(checkResult.body.created).toBeDefined();
    expect(checkResult.body.token).toBeDefined();
    done();
  });

  it("Check user from session", async (done) => {
    const login = await container.um.login(correct, PasswordAuth, "password");
    const user = login.user;

    expect(user.session.token).toBeDefined("Session token should be here");

    const checkResult = await request(app).get(`/user-by-session/${user.session.token}`).expect(200);

    //Check body
    expect(checkResult.body.username).toBe("Co");
    expect(checkResult.body.session.created).toBeDefined();
    expect(checkResult.body.session.created).toBeDefined();
    expect(checkResult.body.session.token).toBeDefined();
    done();
  });

  it("Check Wrong session", async (done) => {
    await request(app).get(`/session/notatoken`)
      .expect(404);
      done();
  });

  it("Expire session", async (done) => {
    const login = await container.um.login(correct, PasswordAuth, "password");
    const user = login.user;

    expect(user.session.token).toBeDefined("Session token should be here");

    //Expire session
    await request(app).delete(`/session/${user.session.token}`).expect(200);

    //Session should be gone.
    await request(app).get(`/session/${user.session.token}`).expect(404);
    done();
  });

  it("Expire non-existing session", async (done) => {
    //Expire session, will quietly go into the night.
    await request(app).delete(`/session/notatoken`).expect(200);
    done();
  });

  it("Expire All Sessions", async (done) => {
    const login = await container.um.login(correct, PasswordAuth, "password");
    const user = login.user;

    expect(user.uuid).toBeDefined("uuid should be available");

    //Expire session
    await request(app).delete(`/session/all/${user.uuid}`).expect(200);

    //Session should be gone.
    await request(app).get(`/session/${user.session.token}`).expect(404);
    done();
  });

  it("Expire non-existing all sessions", async (done) => {
    //Expire session
    await request(app).delete(`/session/all/qwertyuiop`).expect(404);
    done();
  });

});

describe("Users", () => {
  beforeEach(async (done) => {
    app = deadbolt.app;
    await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await container.shutdown();
    done();
  });

  it("Verify password", async (done) => {
    const result = await request(app).post('/verify-password').send({ email: 'co', password: 'password' })
      .expect(200);

    const body = result.body;
    expect(body.verified).toBe(true);
    done();
  });

  it("Verify password, wrong password", async (done) => {
    const result = await request(app).post('/verify-password').send({ email: 'co', password: 'foo' })
      .expect(200);

    const body = result.body;
    expect(body.verified).toBe(false);
    done();
  });

  it("Verify password, wrong user", async (done) => {
    const result = await request(app).post('/verify-password').send({ email: 'notauser', password: 'password' })
      .expect(404);

    const body = result.body;
    expect(body.reason).toBe("User not found");
    done();
  });

  it("Search for users", async (done) => {
    const result = await request(app).get('/users?q=jordan')
      .expect(200);

    const body = result.body;
    expect(body.users.length).toBe(1);
    expect(body.criteria.orderBy).toEqual(['u.id']);
    expect(body.users[0].firstName).toBe("Jordan");
    done();
  });

  it("Search for users, based on role", async (done) => {
    const result = await request(app).get('/users?memberships=admin&memberships=whatever')
      .expect(200);

    const body = result.body;
    expect(body.users.length).toBe(1);
    expect(body.criteria.orderBy).toEqual(['u.id']);
    expect(body.users[0].username).toBe("Co");
    done();
  });

  it("Registers a new user", async (done) => {
    const result = await request(app).post('/user')
      .send({ username: "Morty", password: "jessica69", email: "morty999@gmail.com" })
      .expect(200);

    const body = result.body;
    expect(body.session.token).toBeDefined();

    await request(app).post('/session').send({ username: 'Morty', password: 'jessica69' }).expect(200);
    done();
  });

  it("Registers a new user With Memberships", async (done) => {
    const memberships: Membership[] = [
      { app: "test-app", role: 'pineapple' },
      { app: "test-app-2", role: 'mega man' },
      { app: "test-app", role: 'sea star' },
    ];
    const result = await request(app).post('/user')
      .send({ username: "Morty", password: "jessica69", email: "morty999@gmail.com", memberships })
      .expect(200);

    const body = result.body;
    expect(body.session.token).toBeDefined();
    expect(body.memberships.length).toBe(3);

    await request(app).post('/session').send({ username: 'Morty', password: 'jessica69' }).expect(200);
    done();
  });

  it("Try Register with existing username", async (done) => {
    const user = await container.um.getUserById(1);

    await request(app).post('/user')
      .send({ username: user.username, password: "doesn'treallymatterdoesit?!", email: "morty999@gmail.com" })
      .expect(400);
      done();
  });

  it("Try Register with bad password", async (done) => {

    await request(app).post('/user')
      .send({ username: "Morty", password: "123", email: "morty999@gmail.com" })
      .expect(400);
      done();
  });

  it("Try Register with existing email", async (done) => {
    await request(app).post('/user')
      .send({ username: "PeterParker", password: "doesn'treallymatterdoesit?!", email: "jordan@example.com" })
      .expect(400);
      done();
  });

  it("Try Register, missing arguments", async (done) => {
    await request(app).post('/user')
      .send({ password: "doesn'treallymatterdoesit?!" })
      .expect(400);
      done();
  });

  it("Updates a user by username", async (done) => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ username: "Co", user: data })
      .expect(200);

    const user = await container.um.getUserByUsername("Co");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Co");
    done();
  });

  it("Updates a user by email", async (done) => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ email: "jordan@example.com", user: data })
      .expect(200);

    const user = await container.um.getUserByEmail("Swanky@doodle.com");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Jordan");
    done();
  });

  it("Updates a user by uuid", async (done) => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ uuid: "ee13624b-cf22-4597-adb9-bfa4b16baa71", user: data })
      .expect(200);

    const user = await container.um.getUserByUuid("ee13624b-cf22-4597-adb9-bfa4b16baa71");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Co");
    done();
  });

  it("Updates a user to existing email", async (done) => {
    const data = { email: "jordan@example.com" };

    await request(app).put("/user")
      .send({ uuid: "ee13624b-cf22-4597-adb9-bfa4b16baa71", user: data })
      .expect(500);

    done();
  });

  it("(De)activate a user", async (done) => {
    await request(app).put("/user")
      .send({ username: "co", user: { active: false } })
      .expect(200);

    let user = await container.um.getUserById(1);
    expect(user.active).toBe(false);

    await request(app).put("/user")
      .send({ username: "co", user: { active: true } })
      .expect(200);

    user = await container.um.getUserById(1);
    expect(user.active).toBe(true);
    done();
  });

  it("Purges a user", async (done) => {
    const uuid = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    await request(app).delete(`/user/${uuid}`)
      .expect(200);

    expect(await container.um.userExists(1)).toBe(false);
    done();
  });

  it("Purges a non existing user", async (done) => {
    const uuid = "notauuid";
    await request(app).delete(`/user/${uuid}`)
      .expect(404);
      done();
  });

  it("Get user by uuid", async (done) => {
    const identifier = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    const result = await request(app).get(`/user/${identifier}`)
      .expect(200);

    expect(result.body.username).toBe("Co");

    expect(result.body.memberships.length).toBe(2);
    for (let m of result.body.memberships) {
      expect(m.userId).toBeUndefined();
    }
    done();
  });

  it("Get user by username", async (done) => {
    const identifier = "Co";
    const result = await request(app).get(`/user/${identifier}`)
      .expect(200);

    expect(result.body.username).toBe("Co");
    done();
  });

  it("Get user by email", async (done) => {
    const identifier = "jordan@example.com";
    const encoded = encodeURIComponent(identifier);
    const result = await request(app).get(`/user/${encoded}`)
      .expect(200);

    expect(result.body.username).toBe("Jordan");
    done();
  });

  it("Updates the password", async (done) => {

    const password = "angryticksfireoutofmynipples";
    await request(app).put("/password")
      .send({ username: correct.username, password })
      .expect(200);

    const result = await container.um.login(correct, PasswordAuth, password);
    expect(result.success).toBe(true);
    done();
  });

  it("Requests password reset", async (done) => {
    const email = "jordan@example.com";

    const result = await request(app).post("/reset-password-token")
      .send({ email })
      .expect(200);

    const body = result.body;
    expect(body.result).toBe("ok");

    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(10);

    expect(typeof body.expires).toBe("number");

    expect(typeof body.uuid).toBe("string");
    expect(body.uuid.length).toBeGreaterThan(10);

    done();
    done();
  });

  it("Requests password reset wrong email", async (done) => {
    const email = "someoneelse@example.com";

    await request(app).post("/reset-password-token")
      .send({ email })
      .expect(400);

    done();
    done();
  });

  it("Resets the password", async (done) => {
    const token = "token1234";
    await container.db.query("UPDATE `authPassword` SET resetToken = ?, resetTokenExpires = ? WHERE id = 1", [token, moment().add(1, 'day').unix()]);
    
    const password = "angryticksfireoutofmynipples";
    await request(app).post("/reset-password")
      .send({ token, password })
      .expect(200);

    const result = await container.um.login(correct, PasswordAuth, password);
    expect(result.success).toBe(true);
    done();
  });

  it("Tries Reset the password (Wrong token)", async (done) => {
    const token = "token1234";
    await container.db.query("UPDATE `authPassword` SET resetToken = ?, resetTokenExpires = ? WHERE id = 1", [token, moment().add(1, 'day').unix()]);
    const password = "angryticksfireoutofmynipples";
    const result = await request(app).post("/reset-password")
      .send({ token: "wrong token", password })
      .expect(400);

    expect(result.body.reason).toContain("Token not found");
    done();
  });

  it("Tries reset the password, token expired", async (done) => {
    const token = "token1234";
    await container.db.query("UPDATE `authPassword` SET resetToken = ?, resetTokenExpires = ? WHERE id = 1", [token, moment().subtract(1, 'day').unix()]);
    const password = "angryticksfireoutofmynipples";
    const result = await request(app).post("/reset-password")
      .send({ token, password })
      .expect(400);

    expect(result.body.reason).toContain("expired");
    done();
  });

  it("Confirm Email", async (done) => {
    let user = new User();
    user.username = "Paul";
    user.email = "paul@someplace.com";
    await container.um.addUser(user);

    const result = await request(app).post("/confirm-email")
      .send({ token: user.emailConfirmToken })
      .expect(200);

    expect(result.body.result).toContain("ok");
    expect(result.body.userUuid).toBe(user.uuid);

    done();
  });

  it("Confirm Email, wrong", async (done) => {
    const result = await request(app).post("/confirm-email")
      .send({ token: "12345" })
      .expect(200);

    expect(result.body.result).toContain("invalid");
    expect(result.body.userUuid).toBeNull();

    done();
  });

  it("tries update password non existing user", async (done) => {
    const username = "Co213";
    const password = "angryticksfireoutofmynipples";
    await request(app).put("/password")
      .send({ username, password })
      .expect(404);
      done();
  });
});

describe("Memberships", () => {
  beforeEach(async (done) => {
    app = deadbolt.app;
    await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await container.shutdown();
    done();
  });
  
  it("Adds a membership", async (done) => {
    const identifier = "co";
    const membership: Membership = { app: 'test-app', role: 'mistress' };
    await request(app).post("/membership")
      .send({ identifier, app: membership.app, role: membership.role })
      .expect(200);

    const user = await container.um.getUser(identifier);
    const m = user.memberships.find((ms: Membership) => ms.app === membership.app && ms.role === membership.role);
    expect(user.memberships.length).toBe(3);
    expect(m).toBeDefined();
    done();
  });

  it("Adds multiple memberships", async (done) => {
    const identifier = "co";
    const memberships: Membership[] = [{ app: 'test-app', role: 'mistress' }, { app: 'test-app', role: 'astronaut' }];
    await request(app).post("/memberships")
      .send({ identifier, memberships })
      .expect(200);

    const user = await container.um.getUser(identifier);
    expect(user.hasRole('mistress')).toBe(true);
    expect(user.hasRole('astronaut')).toBe(true);
    expect(user.hasRole('kosmonaut')).toBe(false);
    done();
  });

  it("Replaces memberships", async (done) => {
    const identifier = "co";
    const firstMemberships: Membership[] = [{ app: 'test-app', role: 'mistress' }];
    const newMemberships: Membership[] = [{ app: 'test-app', role: 'barista' }, { app: 'test-app', role: 'astronaut' }];

    await request(app).put("/memberships")
      .send({ identifier, memberships: firstMemberships })
      .expect(200);

    const result = await request(app).put("/memberships")
      .send({ identifier, memberships: newMemberships })
      .expect(200);

    expect(result.body.memberships.length).toBe(2);

    const user = await container.um.getUser(identifier);
    expect(user.hasRole('mistress')).toBe(false);
    expect(user.hasRole('barista')).toBe(true);
    expect(user.hasRole('astronaut')).toBe(true);

    done();
    done();
  });

  it("Adds same membership twice", async (done) => {
    const identifier = "co";
    const membership: Membership = { app: 'test-app', role: 'mistress' };
    await request(app).post("/membership")
      .send({ identifier, app: membership.app, role: membership.role })
      .expect(200);

    await request(app).post("/membership")
      .send({ identifier, app: membership.app, role: membership.role })
      .expect(200);

    const user = await container.um.getUser(identifier);
    const m = user.memberships.find((ms: Membership) => ms.app === membership.app && ms.role === membership.role);
    expect(user.memberships.length).toBe(3);
    expect(m).toBeDefined();
    done();
  });

  it("Updates a membership", async (done) => {
    const identifier = "co";
    const data = { identifier, membershipId: 2, role: 'bottom' };
    await request(app).put("/membership")
      .send(data)
      .expect(200);

    const user = await container.um.getUser(identifier);
    const m = user.memberships.find((ms: Membership) => ms.role === data.role);
    expect(user.memberships.length).toBe(2);
    expect(m).toBeDefined();
    done();
  });

  it("Removes a membership", async (done) => {
    const identifier = "co";
    const membership: Membership = { app: 'test-app', role: 'admin' };

    await request(app).delete(`/membership/${identifier}/${membership.app}/${membership.role}`)
      .expect(200);

    const user = await container.um.getUser(identifier);
    expect(user.memberships.length).toBe(1);
    done();
  });
});