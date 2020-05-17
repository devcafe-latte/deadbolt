import { compareSync, hash, hashSync } from 'bcrypt';
import moment, { Moment } from 'moment';
import uuidv4 from 'uuid/v4';

import container from '../DiContainer';
import { SqlHelper, stripComplexTypes, toObject } from '../helpers';
import { User } from '../User';
import { iAuthMethod } from './iAuthMethod';

export class PasswordAuth implements iAuthMethod {
  static ROUNDS = 10;

  async verify(user: User, password: string) {
    const result = await this.getRecord(user.id);
    if (!result.success) return false;

    if (!result.record.passwordHash || !password) return false;
    return compareSync(password, result.record.passwordHash);
  }

  async setPassword(userId: number, password: string): Promise<PasswordRecordResult> {
    //todo Some strength estimation that isn't shit.
    const minLen = 6;
    const maxLen = 70;
    //todo make a type of return value
    if (password.length <= minLen) return { success: false, reason: "Password to shitty" };
    if (password.length >= maxLen) return { success: false, reason: "Password to long" };

    //Check whether to update or add.
    const recordResult = await this.getRecord(userId);
    if (recordResult.success) {
      //update record
      const hash = hashSync(password, PasswordAuth.ROUNDS);
      await container.db.query("UPDATE `authPassword` SET passwordHash = ?, resetToken = null, resetTokenExpires = null, updated = ? WHERE userId = ?", [hash, moment().unix(), userId]);
      return await this.getRecord(userId);
    } else if (await container.um.userExists(userId)) {
      //Create record
      const record = PasswordRecord.new(userId, password);
      await container.db.query("INSERT INTO `authPassword` SET ?", record.toDb());
      return await this.getRecord(userId);
    } else {
      return { success: false, reason: "User doesn't exist." };
    }

    
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<PasswordRecordResult> {
    const result = await this.getRecordByResetToken(resetToken);
    if (!result.success) return result;
    if (result.record.isExpired()) return { success: false, reason: "Token expired." };

    const setResult = await this.setPassword(result.record.userId, newPassword);

    await container.um.confirmEmailByUserId(result.record.userId);
    return setResult;
  }

  async generateResetToken(userId: number): Promise<PasswordRecordResult> {
    const expiresHours = container.settings.resetTokenExpires;
    const result = await this.getRecord(userId);
    if (!result.success) return result;
    result.record.resetTokenExpires = moment().add(expiresHours, 'hours');
    result.record.resetToken = uuidv4();

    const q = SqlHelper.update("authPassword", result.record.toDb());
    q.sql += " WHERE userId = ?";
    q.values.push(userId);
    await container.db.query(q.sql, q.values);

    return { success: true, record: result.record };
  }

  private async getRecordByResetToken(token: string): Promise<PasswordRecordResult> {
    const rows = await container.db.query("SELECT * FROM authPassword WHERE resetToken = ?", [token]);
    if (rows.length === 0) return { success: false, reason: "Token not found." };
    if (rows.length > 1) return { success: false, reason: "Found too many records. This is not supposed to happen." };

    return { success: true, record: PasswordRecord.fromDb(rows[0]) };
  }

  private async getRecord(userId: number): Promise<PasswordRecordResult> {
    const rows = await container.db.query("SELECT * FROM `authPassword` WHERE userId = ?", [userId]);
    if (rows.length === 0) return { success: false, reason: "Record not found." };
    if (rows.length > 1) return { success: false, reason: "Found too many records. This is not supposed to happen." };

    return { success: true, record: PasswordRecord.fromDb(rows[0]) };
  }
}

export interface PasswordRecordResult {
  success: boolean;
  reason?: string;
  record?: PasswordRecord;
}

export class PasswordRecord {
  id: number = null;
  userId: number = null;
  passwordHash: string = null;
  resetToken?: string = null;
  resetTokenExpires?: Moment = null;
  created: Moment = null;
  updated: Moment = null;

  isExpired(): boolean {
    return this.resetTokenExpires && this.resetTokenExpires.isBefore();
  }

  toDb(): any {
    const obj: any = stripComplexTypes(this);
    if (this.created) obj.created = + this.created.unix();
    if (this.updated) obj.updated = + this.updated.unix();
    if (this.resetTokenExpires) obj.resetTokenExpires = + this.resetTokenExpires.unix();

    return obj;
  }

  static fromDb(row: any): PasswordRecord {
    const r = toObject<PasswordRecord>(PasswordRecord, row);

    if (row.created) r.created = moment.unix(row.created);
    if (row.updated) r.updated = moment.unix(row.updated);
    if (row.resetTokenExpires) r.resetTokenExpires = moment.unix(row.resetTokenExpires);

    return r;
  }

  static new(userId: number, password: string): PasswordRecord {
    const p = new PasswordRecord();
    p.userId = userId;
    p.passwordHash = hashSync(password, 10);
    p.created = moment();
    p.updated = moment();

    return p;
  }
}