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
  const method = PasswordAuth;

  if (!username || !pass) {
    res.status(400);
    res.send({ status: "failed", reason: "Missing arguments (username, password)" });
  }

  const result = await container.um.login(username, method, pass);
  if (!result.success) {
    console.log("Login failed: " + result.reason);
    res.status(422);
    res.send({ status: "failed", reason: result.reason });
  }

  cleanForSending(result.user)
  res.send(result.user);
});

app.get("/session/:token", async (req, res) => {
  const token = req.params.token;
  const session = await container.um.validateSession(token);
  if (!session) {
    res.status(404)
    res.send();
    return;
  }

  cleanForSending(session);
  res.send(session);
});

app.delete("/session/all/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  if (isNumber(uuid)) {
    res.status(400);
    res.send({status: "failed", reason: "invalid uuid"});
  }

  await container.um.expireAllSessions(uuid);
  res.send({status: "ok"});
});

app.delete("/session/:token", async (req, res) => {
  const token = req.params.token;
  await container.um.expireSession(token);
  res.send({status: "ok"});
});
//endregion Sessions

//region Users
app.post("/user", async (req, res) => {
  const body = req.body;
  const required = ["username", "password", "email"];
  if (!hasProperties(body, required)){
    res.status(400);
    return res.send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  const u = new User();
  u.username = body.username;
  u.email = body.email;
  u.firstName = body.firstName;
  u.lastName = body.lastName;

  const result = await container.um.addUser(u);
  if (!result.success) {
    res.status(400);
    return res.send({ status: "failed", reason: result.reason });
  }

  const pa = new PasswordAuth();
  const passwordResult = await pa.setPassword(u.id, body.password);
  if (!passwordResult.success) {
    console.error(passwordResult.reason);
    res.status(500);
    return res.send({status: "failed", reason: passwordResult.reason});
  }

  const loginResult = await container.um.login(body.username, PasswordAuth, body.password);
  if (!loginResult.success) {
    console.error(loginResult.reason);
    res.status(422);
    res.send({ status: "failed", reason: loginResult.reason });
  }

  cleanForSending(loginResult.user)
  res.send(loginResult.user);
});

app.put("/user", async (req, res) => {
  const body = req.body;
  if ((!body.uuid && !body.username && !body.email) || !body.user){
    return res.status(400)
    .send({ status: "failed", reason: "Missing arguments. Need uuid, username or email. Also need a 'user'" });
  }

  let user: User;
  if (body.uuid) {
    user = await container.um.getUserByUuid(body.uuid);
  } else if (body.username) {
    user = await container.um.getUserByUsername(body.username);
  } else if (body.email) {
    user = await container.um.getUserByEmail(body.email);
  }

  if (!user) {
    return res.status(400)
    .send({status: "failed", reason: "User not found" });
  }

  //List properties that we are allowed to change
  const props = ['firstName', 'lastName', 'username', 'email', 'active'];
  for (let p of props) {
    if (body.user[p] !== undefined) user[p] = body.user[p];
  }

  if (!user.isValid()) {
    return res.status(400)
    .send({status: "failed", reason: "User is not valid" });
  }

  await container.um.updateUser(user);

  cleanForSending(user);
  res.send(user);
});

app.delete("/user/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  if (!uuid) {
    return res.status(404)
    .send({status: "failed", reason: "User not found" });
  }
  const success = await container.um.purgeUser(uuid);
  if (success) {
    return res.send({ status: "ok" });
  } else {
    return res.status(404).send({ status: "failed", reason: "User not found" });
  }
});

app.get("/user/:identifier", async (req, res) => {
  const identifier: any = req.params.identifier;
  const type = getIdentifierType(identifier);
  let user: User;
  //Note: We don't get user by ID, because the id should never be exposed to the outside. We have the uuid for that.

  if (type === "uuid") {
    user = await container.um.getUserByUuid(identifier);
  } else if (type === "username") {
    user = await container.um.getUserByUsername(identifier);
  } else if (type === "email") {
    user = await container.um.getUserByEmail(identifier);
  } 

  if (!user) {
    return res.status(404).send({ status: "failed", reason: "User unknown" });
  }

  cleanForSending(user);
  res.send(user);
});

app.put("/password", async (req, res) => {
  const body = req.body;
  if ((!body.uuid && !body.username && !body.email) || !body.password){
    return res.status(400)
    .send({ status: "failed", reason: "Missing arguments. Need uuid, username or email. Also need a 'password'" });
  }

  let user: User;
  if (body.uuid) {
    user = await container.um.getUserByUuid(body.uuid);
  } else if (body.username) {
    user = await container.um.getUserByUsername(body.username);
  } else if (body.email) {
    user = await container.um.getUserByEmail(body.email);
  }

  if (!user) {
    return res.status(400)
    .send({status: "failed", reason: "User not found" });
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