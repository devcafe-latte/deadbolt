import bodyParser from 'body-parser';
import express = require('express');

import { PasswordAuth } from './model/authMethod/PasswordAuth';
import container from './model/DiContainer';
import { cleanForSending, hasProperties } from './model/helpers';
import { User } from './model/User';
import { userMiddleware, requiredBody } from './model/middlewares';
import { Membership } from './model/Membership';
import { Request, Response } from 'express';
import { PoolConnection } from 'promise-mysql';
import { SearchCriteria } from './model/SearchCriteria';

const app: express.Application = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/', async (req, res) => {
  const response: any = {
    express: "ok",
    database: "ok",
    status: "ok"
  };

  let con: PoolConnection;
  try {
    con = await container.db.getConnection();
    con.ping();
  } catch (error) {
    response.database = "not ok";
    response.status = "not ok";
    res.status(500);

    if (container.debug) {
      response.error = error;
    }
  }
  if (con) con.release();

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

app.get("/user-by-session/:token", async (req, res) => {
  const token = req.params.token;
  const session = await container.um.validateSession(token);
  if (!session) {
    return res.status(404).send();
  }

  const user = await container.um.getUserById(session.userId);
  user.session = session;

  cleanForSending(user);
  res.send(user);
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
app.get("/users", async (req, res, next) => {
  const search = SearchCriteria.fromQueryParams(req.query);

  try {
    const result = await container.um.getUsers(search);
    cleanForSending(result);
    res.send(result);
  } catch (err){
    next(err);
  }
});

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

app.post("/reset-password", requiredBody('token', 'password'), async (req, res) => {
  const token = req.body.token;
  const newPassword = req.body.password;

  const pa = new PasswordAuth();
  const result = await pa.resetPassword(token, newPassword);
  if (!result.success) {
    return res.status(400)
      .send({ status: "failed", reason: result.reason });
  }

  const u = await container.um.getUserById(result.record.userId);

  res.send({ result: "ok", uuid: u.uuid });
});

app.post("/reset-password-token", requiredBody('email'), async (req, res, next) => {
  const email = req.body.email;
  
  const u = await container.um.getUserByEmail(email);
  if (!u) {
    return res.status(400)
      .send({ status: "failed", reason: "Email address not found" });
  }

  const pa = new PasswordAuth();
  const result = await pa.generateResetToken(u.id);

  if (!result.success) {
    return res.status(400)
      .send({ status: "failed", reason: result.reason });
  }

  res.send({ result: "ok", token: result.record.resetToken, expires: result.record.resetTokenExpires.unix(), uuid: u.uuid });
});

app.post("/confirm-email", requiredBody('token'), async (req, res) => {
  const token = req.body.token;

  const userUuid = await container.um.confirmEmail(token);

  res.send({ result: userUuid ? 'ok' : 'invalid token', userUuid });
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

//Error handler
app.use((req, res) => {
  //404 handler
  console.log("404 handler reached");
  res.status(404);
  const error = {
    message: "Not found: " + req.method + " " + req.path,
    status: 404
  };
  throw error;
})

app.use((err: any, req: Request, res: Response, next) => {
  console.log("custom error handler");
  res.status(err.status || 500);

  const data = {
    status: "failed",
    path: req.path,
    reason: err.message || "Unknown Error",
    error: undefined
  }

  if (app.get('env') === "development") {
    data.error = err;
  }

  res.send(data);
});

const server = app.listen(port, async () => {
  //warm up
  await container.ready();
  console.log(`Deadbolt is listening on port ${port}!`);
});

server.on('close', async () => {
  console.info("Closing DB Connections...");
  await container.db.end()
    .catch(() => { console.warn("Closing DB connections did not go gracefully."); });
  console.info("Exiting.");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info("Got SIGTERM. Gracefully shutting down.");

  console.info("Stopping Express...");
  server.close();
});

export { app };