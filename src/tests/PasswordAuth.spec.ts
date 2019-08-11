import { TestHelper } from './TestHelper';
import { PasswordAuth, PasswordRecord } from '../model/authMethod/PasswordAuth';
import { User } from '../model/User';
import container from '../model/DiContainer';

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

  it("Should NOT verify", async () => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    const result = await pa.verify(u, "not the password");
    expect(result).toBe(false);
  });
});

describe("Password (re)setting", () => {
  beforeEach(async () => {
    await TestHelper.new();
  });

  it("set password", async() => {
    const pa = new PasswordAuth();
    const u = new User();
    u.id = 1;
    
    expect(await pa.verify(u, "password")).toBe(true, "Check current password");

    await pa.setPassword(1, "password2");

    expect(await pa.verify(u, "password")).toBe(false, "Check current password no longer works.");
    expect(await pa.verify(u, "password2")).toBe(true, "Check new password");
  });

  it("Generate Token", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    const rows = await container.db.query("SELECT * FROM `authPassword`");
    const record = PasswordRecord.fromDb(rows[0]);
    expect(record.resetToken).toBeDefined();
    expect(record.resetTokenExpires).toBeDefined();
  });

  it("Reset password", async () => {
    const pa = new PasswordAuth();
    await pa.generateResetToken(1);
    let rows = await container.db.query("SELECT * FROM `authPassword`");
    let record = PasswordRecord.fromDb(rows[0]);
    
    const result = await pa.resetPassword(record.resetToken, "password2");
    expect(result.success).toBe(true, "Reset should have happened");
  
    rows = await container.db.query("SELECT * FROM `authPassword`");
    record = PasswordRecord.fromDb(rows[0]);

    expect(record.resetToken).toBe(null);
    expect(record.resetTokenExpires).toBe(null);
    
    const u = new User();
    u.id = 1;
    expect(await pa.verify(u, "password2")).toBe(true);
  });
});