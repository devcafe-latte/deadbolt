import { app } from '../app';

import request from 'supertest';
import { TestHelper } from './TestHelper';
import container from '../model/DiContainer';
import { PasswordAuth } from '../model/authMethod/PasswordAuth';
import { Membership } from '../model/Membership';

TestHelper.setTestEnv();

describe("App", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("tests", async () => {
    const result = await request(app).get("/")
      .expect(200);
    const body = result.body;
    expect(body.database).toBe("ok");
    expect(body.express).toBe("ok");
    expect(body.status).toBe("ok");
  });
});

describe("Sessions", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("New Session", async () => {
    const result = await request(app)
      .post('/session')
      .send({ username: 'Co', password: "password" })
      .expect(200);

    const body = result.body;
    expect(body.session.token).toBeDefined();

  });

  it("Wrong password", async () => {
    await request(app)
      .post('/session')
      .send({ username: 'Co', password: "notapassword" })
      .expect(422);
  });

  it("Wrong username", async () => {
    await request(app)
      .post('/session')
      .send({ username: 'Spongebob', password: "notapassword" })
      .expect(422);
  });

  it("Login missing arguments", async () => {
    await request(app)
      .post('/session')
      .send({ password: "notapassword" })
      .expect(400);
  });

  it("Check session", async () => {
    const login = await container.um.login("co", PasswordAuth, "password");
    const user = login.user;

    expect(user.session.token).toBeDefined("Session token should be here");

    const checkResult = await request(app).get(`/session/${user.session.token}`).expect(200);

    //Check body
    expect(checkResult.body.created).toBeDefined();
    expect(checkResult.body.created).toBeDefined();
    expect(checkResult.body.token).toBeDefined();
  });

  it("Check Wrong session", async () => {
    await request(app).get(`/session/notatoken`)
      .expect(404);
  });

  it("Expire session", async () => {
    const login = await container.um.login("co", PasswordAuth, "password");
    const user = login.user;

    expect(user.session.token).toBeDefined("Session token should be here");

    //Expire session
    await request(app).delete(`/session/${user.session.token}`).expect(200);

    //Session should be gone.
    await request(app).get(`/session/${user.session.token}`).expect(404);
  });

  it("Expire non-existing session", async () => {
    //Expire session, will quietly go into the night.
    await request(app).delete(`/session/notatoken`).expect(200);
  });

  it("Expire All Sessions", async () => {
    const login = await container.um.login("co", PasswordAuth, "password");
    const user = login.user;

    expect(user.uuid).toBeDefined("uuid should be available");

    //Expire session
    await request(app).delete(`/session/all/${user.uuid}`).expect(200);

    //Session should be gone.
    await request(app).get(`/session/${user.session.token}`).expect(404);
  });

  it("Expire non-existing all sessions", async () => {
    //Expire session
    await request(app).delete(`/session/all/qwertyuiop`).expect(404);
  });

});

describe("Users", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("Registers a new user", async () => {
    const result = await request(app).post('/user')
      .send({ username: "Morty", password: "jessica69", email: "morty999@gmail.com" })
      .expect(200);

    const body = result.body;
    expect(body.session.token).toBeDefined();

    await request(app).post('/session').send({ username: 'Morty', password: 'jessica69' }).expect(200);
  });

  it("Try Register with existing username", async () => {
    const user = await container.um.getUserById(1);

    await request(app).post('/user')
      .send({ username: user.username, password: "doesn'treallymatterdoesit?!", email: "morty999@gmail.com" })
      .expect(400);
  });

  it("Try Register with bad password", async () => {

    await request(app).post('/user')
      .send({ username: "Morty", password: "123", email: "morty999@gmail.com" })
      .expect(400);
  });

  it("Try Register with existing email", async () => {
    await request(app).post('/user')
      .send({ username: "PeterParker", password: "doesn'treallymatterdoesit?!", email: "jordan@example.com" })
      .expect(400);
  });

  it("Try Register, missing arguments", async () => {
    await request(app).post('/user')
      .send({ password: "doesn'treallymatterdoesit?!" })
      .expect(400);
  });

  it("Updates a user by username", async () => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ username: "Co", user: data })
      .expect(200);

    const user = await container.um.getUserByUsername("Co");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Co");
  });

  it("Updates a user by email", async () => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ email: "jordan@example.com", user: data })
      .expect(200);

    const user = await container.um.getUserByEmail("Swanky@doodle.com");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Jordan");
  });

  it("Updates a user by uuid", async () => {
    const data = { firstName: "Swanky", lastName: "McSwankFace", email: "Swanky@doodle.com" };

    await request(app).put("/user")
      .send({ uuid: "ee13624b-cf22-4597-adb9-bfa4b16baa71", user: data })
      .expect(200);

    const user = await container.um.getUserByUuid("ee13624b-cf22-4597-adb9-bfa4b16baa71");
    expect(user.firstName).toBe(data.firstName);
    expect(user.lastName).toBe(data.lastName);
    expect(user.email).toBe(data.email);
    expect(user.username).toBe("Co");
  });

  it("(De)activate a user", async () => {
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
  });

  it("Purges a user", async () => {
    const uuid = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    await request(app).delete(`/user/${uuid}`)
      .expect(200);

    expectAsync(container.um.userExists(1)).toBeResolvedTo(false);
  });

  it("Purges a non existing user", async () => {
    const uuid = "notauuid";
    await request(app).delete(`/user/${uuid}`)
      .expect(404);
  });

  it("Get user by uuid", async () => {
    const identifier = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    const result = await request(app).get(`/user/${identifier}`)
      .expect(200);

    expect(result.body.username).toBe("Co");
  });

  it("Get user by username", async () => {
    const identifier = "Co";
    const result = await request(app).get(`/user/${identifier}`)
      .expect(200);

    expect(result.body.username).toBe("Co");
  });

  it("Get user by email", async () => {
    const identifier = "jordan@example.com";
    const encoded = encodeURIComponent(identifier);
    const result = await request(app).get(`/user/${encoded}`)
      .expect(200);

    expect(result.body.username).toBe("Jordan");
  });

  it("Updates the password", async () => {
    const username = "Co";
    const password = "angryticksfireoutofmynipples";
    await request(app).put("/password")
      .send({ username, password })
      .expect(200);

    const result = await container.um.login(username, PasswordAuth, password);
    expect(result.success).toBe(true);
  });

  it("tries non existing user", async () => {
    const username = "Co213";
    const password = "angryticksfireoutofmynipples";
    await request(app).put("/password")
      .send({ username, password })
      .expect(404);
  });
});

describe("Memberships", () => {
  it("Adds a membership", async () => {
    const identifier = "co";
    const membership: Membership = { app: 'test-app', role: 'mistress' };
    await request(app).post("/membership")
      .send({ identifier, app: membership.app, role: membership.role })
      .expect(200);

    const user = await container.um.getUser(identifier);
    const m = user.memberships.find((ms: Membership) => ms.app === membership.app && ms.role === membership.role);
    expect(user.memberships.length).toBe(3);
    expect(m).toBeDefined();
  });

  it("Adds same membership twice", async () => {
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
  });

  it("Updates a membership", async () => {
    const identifier = "co";
    const data = { identifier, membershipId: 2, role: 'bottom' };
    await request(app).put("/membership")
      .send(data)
      .expect(200);

    const user = await container.um.getUser(identifier);
    const m = user.memberships.find((ms: Membership) => ms.role === data.role);
    expect(user.memberships.length).toBe(2);
    expect(m).toBeDefined();
  });
});