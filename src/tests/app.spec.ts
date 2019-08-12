import { app } from '../app';

import request from 'supertest';
import { TestHelper } from './TestHelper';
import container from '../model/DiContainer';
import { PasswordAuth } from '../model/authMethod/PasswordAuth';

TestHelper.setTestEnv();

describe("App", () => {
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
    await request(app).delete(`/session/all/qwertyuiop`).expect(200);
  });

});

describe("Users", () => {
  it("Registers a new users", async () => {
    const result = await request(app).post('/user')
    .send({ username: "Morty", password: "jessica69", email: "morty999@gmail.com" })
    .expect(200);

    //todo
    //test that result is a user with a session
    //test I can login
    // Test I can't register the same email address or username again.
  });
});