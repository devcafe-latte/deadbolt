import express = require('express');
import container from './model/DiContainer';
import bodyParser from 'body-parser';
import { PasswordAuth } from './model/authMethod/PasswordAuth';
import { cleanForSending, hasProperties } from './model/helpers';
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

  await container.um.addUser(u);

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

//endregion Users

app.listen(port, async () => {
  //warm up
  await container.ready();
  console.log(`Deadbolt is listening on port ${port}!`);
});

export { app };