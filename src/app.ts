import bodyParser from 'body-parser';
import express = require('express');

import { PasswordAuth } from './model/authMethod/PasswordAuth';
import container from './model/DiContainer';
import { cleanForSending, hasProperties } from './model/helpers';
import { User } from './model/User';
import { userMiddleware, requiredBody } from './model/middlewares';
import { Membership } from './model/Membership';

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
app.post('/session', requiredBody("username", "password"), async (req, res) => {
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

app.delete("/session/all/:identifier", userMiddleware, async (req, res) => {
  const user: User = req.params._user;

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

  //Create the user
  const result = await container.um.addUser(u);
  if (!result.success) {
    return res.status(400)
      .send({ status: "failed", reason: result.reason });
  }

  //Add memberships
  if (body.memberships) {
    await container.um.addMemberships(u.id, body.memberships);
  }

  //Set the password
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

app.put("/user", userMiddleware, async (req, res) => {
  const body = req.body;
  let user: User = req.params._user;

  if (!body.user) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing 'user' object" });
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

app.delete("/user/:identifier", userMiddleware, async (req, res) => {
  const user: User = req.params._user;

  await container.um.purgeUser(user.uuid);
  res.send({ status: "ok" });
});

app.get("/user/:identifier", userMiddleware, async (req, res) => {
  let user: User = req.params._user;

  cleanForSending(user);
  res.send(user);
});

app.put("/password", userMiddleware, async (req, res) => {
  const body = req.body;
  const user: User = req.params._user;

  if (!body.password) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing argument: 'password'" });
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

//region Memberships
app.post("/membership", userMiddleware, async (req, res) => {
  const body = req.body;
  const required = ["app", "role"];
  if (!hasProperties(body, required)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  let user = req.params._user;

  //Check if membership already exists.
  const m = user.memberships.find((ms: Membership) => ms.app === body.app && ms.role === body.role);

  if (m) {
    //ALready exists.
    cleanForSending(user);
    return res.send(user);
  }

  await container.um.addMemberships(user.id, { app: body.app, role: body.role });
  user = await container.um.getUser(body.identifier);

  cleanForSending(user);
  res.send(user);
});

app.put("/membership", userMiddleware, async (req, res) => {
  const body = req.body;
  const required = ["membershipId", "role"];
  if (!hasProperties(body, required)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  let user = req.params._user;

  //Check if membership exists.
  const m: Membership = user.memberships.find((ms: Membership) => ms.id === body.membershipId);

  if (!m) {
    return res.status(404)
      .send({ status: "failed", readon: "Membership not found" });
  }

  m.role = body.role;

  await container.um.updateMembership(m);
  user = await container.um.getUser(body.identifier);

  cleanForSending(user);
  res.send(user);
});

app.delete("/membership/:identifier/:app/:role", userMiddleware, async (req, res) => {
  let user: User = req.params._user;

  await container.um.removeMemberships(user.id, { app: req.params.app, role: req.params.role });

  user = await container.um.getUser(user.id);

  cleanForSending(user);
  res.send(user);
});
//endregion

app.listen(port, async () => {
  //warm up
  await container.ready();
  console.log(`Deadbolt is listening on port ${port}!`);
});

export { app };