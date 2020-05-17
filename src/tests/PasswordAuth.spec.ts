import moment = require('moment');

import { PasswordAuth, PasswordRecord } from '../model/authMethod/PasswordAuth';
import container from '../model/DiContainer';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';

describe("Password Verification", () => {
  let th: TestHelper;

  beforeEach(async (done) => {
    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it("Should verify", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "password");
    expect(result).toBe(true);
    done()
  });

  it("Plaintext Password hack", async (done) => {
    const plain = "plain:bluppo";
    await container.db.query("UPDATE `authPassword` SET `passwordHash` = ? WHERE userId = 1", [plain]);

    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "bluppo");
    expect(result).toBe(true);

    const row = await container.db.query("SELECT * FROM `authPassword` WHERE userId = 1");
    expect(row.passwordHash).not.toBe(plain);

    const result2 = await pa.verify(u, "bluppo");
    expect(result2).toBe(true);

    done()
  });

  it("Wrong password", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "not the password");
    expect(result).toBe(false);
    done()
  });

  it("Empty password", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "");
    expect(result).toBe(false);
    done()
  });

  it("User doesn't exist", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 273;
    const result = await pa.verify(u, "not the password");
    expect(result).toBe(false);
    done()
  });
});

describe("Password (re)setting", () => {
  let th: TestHelper;
  
  beforeEach(async (done) => {
    th = await TestHelper.new();
    done()
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it("set password, existing record", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;

    expect(await pa.verify(u, "password")).toBe(true, "Check current password");

    const result = await pa.setPassword(1, "password2");
    expect(result.success).toBe(true, "New password set.");

    expect(await pa.verify(u, "password")).toBe(false, "Check current password no longer works.");
    expect(await pa.verify(u, "password2")).toBe(true, "Check new password");
    done()
  });

  it("set password, new record", async (done) => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    //kill existing record
    await container.db.query("DELETE FROM `authPassword` WHERE `userId` = 1");

    expect(await pa.verify(u, "password")).toBe(false, "No current password set");

    const result = await pa.setPassword(1, "password");
    expect(result.success).toBe(true, "New password set.");

    expect(await pa.verify(u, "password")).toBe(true, "Password should be set now.");
    done()
  });

  it("set password non existing user", async (done) => {
    const pa = new PasswordAuth();

    const result = await pa.setPassword(74, "password");
    expect(result.success).toBe(false, "User doens't exist.");
    done()
  });

  it("set too short password", async (done) => {
    const pa = new PasswordAuth();
    const result = await pa.setPassword(1, "123");
    expect(result.success).toBe(false);
    done()
  });

  it("set too long password", async (done) => {
    const pa = new PasswordAuth();
    const result = await pa.setPassword(1, "1234567890".repeat(10));
    expect(result.success).toBe(false);
    done()
  });

  it("Generate Token", async (done) => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    const rows = await container.db.query("SELECT * FROM `authPassword`");
    const record = PasswordRecord.fromDb(rows[0]);
    expect(record.resetToken).toBeDefined();
    expect(record.resetTokenExpires).toBeDefined();
    done()
  });

  it("Generate Token, wrong userId", async (done) => {
    const pa = new PasswordAuth();
    const result = await pa.generateResetToken(6363);
    expect(result.success).toBe(false, "Invalid user ID");
    done()
  });

  it("Reset password", async (done) => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    let rows = await container.db.query("SELECT * FROM `authPassword`");
    let record = PasswordRecord.fromDb(rows[0]);

    const result = await pa.resetPassword(record.resetToken, "password2");
    expect(result.success).toBe(true, "Reset should have happened");
    expect(result.record).toBeDefined("Reset should have happened");
    expect(result.record.userId).toBe(1);

    rows = await container.db.query("SELECT * FROM `authPassword`");
    record = PasswordRecord.fromDb(rows[0]);

    expect(record.resetToken).toBe(null);
    expect(record.resetTokenExpires).toBe(null);

    const u = new User();
    u.id = 1;
    expect(await pa.verify(u, "password2")).toBe(true);
    done()
  });

  it("Wrong reset token", async (done) => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);

    const result = await pa.resetPassword("Definitelynotthetoken", "password2");
    expect(result.success).toBe(false, "Should fail: Invalid token");
    done()
  });

  it("Reset token expired", async (done) => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);

    await container.db.query("UPDATE authPassword SET resetTokenExpires = ? WHERE id = 1", [moment().subtract(1, 'minute').unix()]);

    const rows = await container.db.query("SELECT * FROM `authPassword`");
    const record = PasswordRecord.fromDb(rows[0]);

    const result = await pa.resetPassword(record.resetToken, "password2");
    expect(result.success).toBe(false, "Should fail: Expired token");
    done()
  });
});