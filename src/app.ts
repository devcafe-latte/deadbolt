import express = require('express');
import container from './model/DiContainer';
import bodyParser from 'body-parser';
import { PasswordAuth } from './model/authMethod/PasswordAuth';
import { cleanForSending, hasProperties, getIdentifierType } from './model/helpers';
import { isNumber } from 'util';
import { User } from './model/User';

const app: express.Application = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/', async (req, res) => {
  const response: any = {
    express: "ok",
    database: "ok",
    status: "ok"
  };

  try {
    await container.db.ping();
  } catch (error) {
    response.database = "not ok";
    response.status = "not ok";
    res.status(500);

    if (container.debug) {
      response.error = error;
    }
  }

  res.send(response);
});


//Region Sessions
app.post('/session', async (req, res) => {
  const username = req.body.username || null;
  const pass = req.body.password || null;

  //todo make this dynamic to support other methods..
  // Also allow login with email 
  const method = PasswordAuth;

  if (!username || !pass) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments (username, password)" });
  }

  const result = await container.um.login(username, method, pass);
  if (!result.success) {
    return res.status(422)
      .send({ status: "failed", reason: result.reason });
  }

  cleanForSending(result.user)
  res.send(result.user);
});

app.get("/session/:token", async (req, res) => {
  const token = req.params.token;
  const session = await container.um.validateSession(token);
  if (!session) {
    return res.status(404).send();
  }

  cleanForSending(session);
  res.send(session);
});

app.delete("/session/all/:identifier", async (req, res) => {
  const identifier = req.params.identifier;
  const user = await container.um.getUser(identifier);

  if (!user) {
    return res.status(404)
      .send({ status: "failed", reason: "User not found" });
  }

  await container.um.expireAllSessions(user.uuid);
  res.send({ status: "ok" });
});

app.delete("/session/:token", async (req, res) => {
  const token = req.params.token;
  await container.um.expireSession(token);
  res.send({ status: "ok" });
});
//endregion Sessions

//region Users
app.post("/user", async (req, res) => {
  const body = req.body;
  const required = ["username", "password", "email"];
  if (!hasProperties(body, required)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  const u = new User();
  u.username = body.username;
  u.email = body.email;
  u.firstName = body.firstName;
  u.lastName = body.lastName;

  const result = await container.um.addUser(u);
  if (!result.success) {
    return res.status(400)
      .send({ status: "failed", reason: result.reason });
  }

  const pa = new PasswordAuth();
  const passwordResult = await pa.setPassword(u.id, body.password);
  if (!passwordResult.success) {
    return res.status(400)
      .send({ status: "failed", reason: passwordResult.reason });
  }

  const loginResult = await container.um.login(body.username, PasswordAuth, body.password);
  
  cleanForSending(loginResult.user)
  res.send(loginResult.user);
});

app.put("/user", async (req, res) => {
  const body = req.body;
  const identifier = body.identifier || body.uuid || body.username || body.email;

  if (!identifier || !body.user) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments. Need 'identifier' and  'user'" });
  }

  let user = await container.um.getUser(identifier);

  if (!user) {
    return res.status(404)
      .send({ status: "failed", reason: "User not found" });
  }

  //List properties that we are allowed to change
  const props = ['firstName', 'lastName', 'username', 'email', 'active'];
  for (let p of props) {
    if (body.user[p] !== undefined) user[p] = body.user[p];
  }

  if (!user.isValid()) {
    return res.status(400)
      .send({ status: "failed", reason: "User is not valid" });
  }

  await container.um.updateUser(user);

  cleanForSending(user);
  res.send(user);
});

app.delete("/user/:identifier", async (req, res) => {
  const identifier = req.params.identifier;
  const user = await container.um.getUser(identifier);

  if (!user) {
    return res.status(404)
      .send({ status: "failed", reason: "User not found" });
  }

  await container.um.purgeUser(user.uuid);
  res.send({ status: "ok" });
});

app.get("/user/:identifier", async (req, res) => {
  const identifier: any = req.params.identifier;
  let user = await container.um.getUser(identifier);

  if (!user) {
    return res.status(404)
      .send({ status: "failed", reason: "User not found" });
  }

  cleanForSending(user);
  res.send(user);
});

app.put("/password", async (req, res) => {
  const body = req.body;
  const identifier = body.identifier || body.uuid || body.id || body.username || body.email;

  if (!identifier || !body.password) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments. Need uuid, username or email. Also need a 'password'" });
  }

  const user = await container.um.getUser(identifier);
  if (!user) {
    return res.status(404)
      .send({ status: "failed", reason: "User not found" });
  }

  const pa = new PasswordAuth();
  const result = await pa.setPassword(user.id, body.password);
  if (!result.success) {
    return res.status(400)
      .send({ status: "failed", reason: result.reason });
  }

  res.send({ result: "ok" });
});
//endregion Users

app.listen(port, async () => {
  //warm up
  await container.ready();
  console.log(`Deadbolt is listening on port ${port}!`);
});

export { app };