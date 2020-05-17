import bodyParser from 'body-parser';
import express = require('express');
import { PoolConnection } from 'promise-mysql';

import container from '../model/DiContainer';
import { PasswordAuth } from './authMethod/PasswordAuth';
import { cleanForSending, hasProperties } from './helpers';
import { Membership } from './Membership';
import { requiredBody, userMiddleware } from './middlewares';
import { LoginRequest } from './RequestBody';
import { SearchCriteria } from './SearchCriteria';
import { Seeder } from './Seeder';
import { User } from './User';
import { get2fa } from './twoFactor/2faHelper';

const router = express.Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', async (req, res) => {
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

router.post('/seed', async (req, res, next) => {
  try {
    const s = new Seeder(container.settings);
    await s.seed()
    res.send({ result: "ok" });
  } catch (err) {
    next(err);
  }
});

//Region 2FA
router.post('/verify-2fa', userMiddleware, requiredBody("type", "data"), async (req, res, next) => {
  const type: any = req.body.type;
  const user: User = req.params._user;

  try {
    const result = await container.um.verifyTwoFactor(user, type, req.body.data);
    if (!result.success) {
      return res.status(422)
        .send({ status: "failed", reason: result.reason });
    }

    cleanForSending(result)
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post('/setup-2fa', userMiddleware, requiredBody("type"), async (req, res, next) => {
  const type: any = req.body.type;
  const user: User = req.params._user;

  try {
    const two = get2fa(type);
    const data = await two.setup(user);

    cleanForSending(data)
    res.send({ result: 'ok', data });
  } catch (err) {
    next(err);
  }
});
//endregion

//Region Sessions
router.post('/session', requiredBody("username", "password"), async (req, res) => {
  const body: LoginRequest = req.body;

  //todo make this dynamic to support other methods..
  // Also allow login with email 
  const method = PasswordAuth;

  const result = await container.um.login(body, method, body.password);
  if (!result.success) {
    return res.status(422)
      .send({ status: "failed", reason: result.reason });
  }

  cleanForSending(result)
  res.send(result);
});

router.get("/session/:token", async (req, res) => {
  const token = req.params.token;
  const session = await container.um.validateSession(token);
  if (!session) {
    return res.status(404).send();
  }

  cleanForSending(session);
  res.send(session);
});

router.get("/user-by-session/:token", async (req, res) => {
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

router.delete("/session/all/:identifier", userMiddleware, async (req, res) => {
  const user: User = req.params._user;

  await container.um.expireAllSessions(user.uuid);
  res.send({ status: "ok" });
});

router.delete("/session/:token", async (req, res) => {
  const token = req.params.token;
  await container.um.expireSession(token);
  res.send({ status: "ok" });
});
//endregion Sessions

//region Users
router.get("/users", async (req, res, next) => {
  const search = SearchCriteria.fromQueryParams(req.query);

  try {
    const result = await container.um.getUsers(search);
    cleanForSending(result);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/user", requiredBody("username", "password", "email"), async (req, res) => {
  const body = req.body;

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

  const loginResult = await container.um.login(body, PasswordAuth, body.password);

  cleanForSending(loginResult.user)
  res.send(loginResult.user);
});

router.post("/verify-password", userMiddleware, async (req, res) => {
  const body = req.body;
  const required = ["password"];
  if (!hasProperties(body, required)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  const user = req.params._user;
  const pa = new PasswordAuth();
  try {
    const verified = await pa.verify(user, body.password);
    return res.send({ result: 'ok', verified });
  } catch (error) {
    console.error("Error verifying password", error);
    return res.status(500)
      .send({ status: "failed", reason: "Server error.", error: error.message || null });
  }

});

router.put("/user", userMiddleware, async (req, res) => {
  const body = req.body;
  let user: User = req.params._user;

  if (!body.user) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing 'user' object" });
  }

  //List properties that we are allowed to change
  const props = ['firstName', 'lastName', 'username', 'email', 'active', 'twoFactor'];
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

router.delete("/user/:identifier", userMiddleware, async (req, res) => {
  const user: User = req.params._user;

  await container.um.purgeUser(user.uuid);
  res.send({ status: "ok" });
});

router.get("/user/:identifier", userMiddleware, async (req, res) => {
  let user: User = req.params._user;

  cleanForSending(user);
  res.send(user);
});

router.put("/password", userMiddleware, async (req, res) => {
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

router.post("/reset-password", requiredBody('token', 'password'), async (req, res) => {
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

router.post("/reset-password-token", requiredBody('email'), async (req, res, next) => {
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

router.post("/confirm-email", requiredBody('token'), async (req, res) => {
  const token = req.body.token;

  const userUuid = await container.um.confirmEmail(token);

  res.send({ result: userUuid ? 'ok' : 'invalid token', userUuid });
});
//endregion Users

//region Memberships
router.post("/membership", userMiddleware, async (req, res) => {
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

router.post("/memberships", userMiddleware, async (req, res) => {
  const body = req.body;
  if (!body.memberships || !Array.isArray(body.memberships)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: memberships" });
  }

  const required = ["app", "role"];
  const newMemberships = [];
  let user = req.params._user;

  for (let m of body.memberships) {
    if (!hasProperties(m, required)) {
      return res.status(400)
        .send({ status: "failed", reason: "Missing membership arguments: " + required.join(", ") });
    }

    if (!user.hasRole(m.role)) newMemberships.push(m);
  }

  await container.um.addMemberships(user.id, newMemberships);
  user = await container.um.getUser(body.identifier);

  cleanForSending(user);
  res.send(user);
});

router.put("/membership", userMiddleware, async (req, res) => {
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

router.put("/memberships", userMiddleware, async (req, res) => {
  console.log("Replacing memberships " + req.params._user.uuid);

  const body = req.body;
  const required = ["memberships"];
  if (!hasProperties(body, required)) {
    return res.status(400)
      .send({ status: "failed", reason: "Missing arguments: " + required.join(", ") });
  }

  const memberships: Membership[] = [];
  for (let m of body.memberships) {
    const required = ["app", "role"];
    if (hasProperties(m, required)) memberships.push(m);
  }

  let user = req.params._user;

  await container.um.replaceMemberships(user.id, memberships);
  user = await container.um.getUser(user.uuid);

  cleanForSending(user);
  res.send(user);
});

router.delete("/membership/:identifier/:app/:role", userMiddleware, async (req, res) => {
  let user: User = req.params._user;

  await container.um.removeMemberships(user.id, { app: req.params.app, role: req.params.role });

  user = await container.um.getUser(user.id);

  cleanForSending(user);
  res.send(user);
});
//endregion

export { router as publicRoutes };