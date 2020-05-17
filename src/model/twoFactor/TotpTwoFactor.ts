import { generateSecret, totp } from 'speakeasy';

import container from '../DiContainer';
import { User } from '../User';
import { twoFactor } from './2faHelper';

export class TotpTwoFactor implements twoFactor {
  type: "totp";

  async setup(u: User) {
    //Make sure it doens't exist yet.
    const oldSecret = await this.getSecret(u.id);
    if (oldSecret) await this.reset(u);

    const se = generateSecret();

    const secret: TotpSecret = {
      userId: u.id,
      secret: se.base32,
    }

    await container.db.query("INSERT INTO `totpTwoFactor` SET ?", secret);

    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(container.settings.otpLabel)}:${encodeURIComponent(u.email || u.username)}?secret=${secret.secret}&issuer=${encodeURIComponent(container.settings.otpIssuer)}`;

    return {
      ...secret,
      otpAuthUrl
    }
  }

  async verify(u: User, data: { token: string }) {
    const secret = await this.getSecret(u.id);
    if (!secret) return false;
    if (!data.token) return false;

    const verified = totp.verify({
      secret: secret.secret,
      encoding: 'base32',
      token: data.token,
      window: 1,
    });

    return verified;
  }

  async request(u: User) {
    return { message: "Use Authenticator App for Token" };
  }

  async reset(u: User) {
    await container.db.query("DELETE FROM `totpTwoFactor` WHERE userId = ?", [u.id]);
  }

  private async getSecret(userId: number): Promise<TotpSecret> {
    const rows = await container.db.query("SELECT * FROM `totpTwoFactor` WHERE userId = ?", [userId]);
    if (rows.length === 0) return null;
    return rows[0];
  }

}

export interface TotpSecret {
  id?: number;
  userId: number;
  secret: string;
}