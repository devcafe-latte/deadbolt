import { TestHelper } from './TestHelper';
import { PasswordAuth, PasswordRecord } from '../model/authMethod/PasswordAuth';
import { User } from '../model/User';
import container from '../model/DiContainer';
import moment = require('moment');

describe("Password Verification", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("Should verify", async () => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "password");
    expect(result).toBe(true);
  });

  it("Wrong password", async () => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "not the password");
    expect(result).toBe(false);
  });

  it("Empty password", async () => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "");
    expect(result).toBe(false);
  });

  it("User doesn't exist", async () => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 273;
    const result = await pa.verify(u, "not the password");
    expect(result).toBe(false);
  });
});

describe("Password (re)setting", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("set password, existing record", async() => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    
    expect(await pa.verify(u, "password")).toBe(true, "Check current password");

    const result = await pa.setPassword(1, "password2");
    expect(result.success).toBe(true, "New password set.");

    expect(await pa.verify(u, "password")).toBe(false, "Check current password no longer works.");
    expect(await pa.verify(u, "password2")).toBe(true, "Check new password");
  });

  it("set password, new record", async() => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    //kill existing record
    await container.db.query("DELETE FROM `authPassword` WHERE `userId` = 1");
    
    expect(await pa.verify(u, "password")).toBe(false, "No current password set");

    const result = await pa.setPassword(1, "password");
    expect(result.success).toBe(true, "New password set.");

    expect(await pa.verify(u, "password")).toBe(true, "Password should be set now.");
  });

  it("set password non existing user", async() => {
    const pa = new PasswordAuth();

    const result = await pa.setPassword(74, "password");
    expect(result.success).toBe(false, "User doens't exist.");
  });

  it("set too short password", async() => {
    const pa = new PasswordAuth();
    const result = await pa.setPassword(1, "123");
    expect(result.success).toBe(false);
  });

  it("set too long password", async() => {
    const pa = new PasswordAuth();
    const result = await pa.setPassword(1, "1234567890".repeat(10));
    expect(result.success).toBe(false);
  });

  it("Generate Token", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    const rows = await container.db.query("SELECT * FROM `authPassword`");
    const record = PasswordRecord.fromDb(rows[0]);
    expect(record.resetToken).toBeDefined();
    expect(record.resetTokenExpires).toBeDefined();
  });

  it("Generate Token, wrong userId", async () => {
    const pa = new PasswordAuth();
    const result = await pa.generateResetToken(6363);
    expect(result.success).toBe(false, "Invalid user ID");
  });

  it("Reset password", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    let rows = await container.db.query("SELECT * FROM `authPassword`");
    let record = PasswordRecord.fromDb(rows[0]);
    
    const result = await pa.resetPassword(record.resetToken, "password2");
    expect(result.success).toBe(true, "Reset should have happened");
    expect(result.record).toBeDefined("Reset should have happened");
    expect(result.record.userId).toBe(1,);
  
    rows = await container.db.query("SELECT * FROM `authPassword`");
    record = PasswordRecord.fromDb(rows[0]);

    expect(record.resetToken).toBe(null);
    expect(record.resetTokenExpires).toBe(null);
    
    const u = new User();
    u.id = 1;
    expect(await pa.verify(u, "password2")).toBe(true);
  });

  it("Wrong reset token", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    
    const result = await pa.resetPassword("Definitelynotthetoken", "password2");
    expect(result.success).toBe(false, "Should fail: Invalid token");
  });

  it("Reset token expired", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);

    await container.db.query("UPDATE authPassword SET resetTokenExpires = ? WHERE id = 1", [moment().subtract(1, 'minute').unix()]);

    const rows = await container.db.query("SELECT * FROM `authPassword`");
    const record = PasswordRecord.fromDb(rows[0]);
    
    const result = await pa.resetPassword(record.resetToken, "password2");
    expect(result.success).toBe(false, "Should fail: Expired token");
  });
});