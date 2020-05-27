import { totp } from 'speakeasy';

import container from '../model/DiContainer';
import { TotpTwoFactor } from '../model/twoFactor/TotpTwoFactor';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';

describe("TOTP Two Factor Auth", () => {
  let th: TestHelper;
  let user: User;

  beforeEach(async (done) => {
    th = await TestHelper.new();
    user = await container.um.getUser('co');
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it("Request", async (done) => {
    const two = new TotpTwoFactor();
    await two.setup(user);
    const data = await two.request(user);
    expect(data.attempt).toBe(0);
    expect(data.userToken.length).toBe(32);
    expect(data.totpTwoFactorId).not.toBeNull();
    expect(data.expires).not.toBeNull();

    done();
  });

  it("Setup", async (done) => {

    const two = new TotpTwoFactor();
    const data = await two.setup(user);
    expect(data.secret.length).toBe(52);
    expect(data.otpAuthUrl).toBeDefined();
    expect(data.userId).toBe(user.id);
    expect(data.userToken).not.toBeNull();
    expect(data.expires).not.toBeNull();

    const rows = await container.db.query("SELECT * FROM `totpTwoFactor` WHERE id = ?", [user.id]);
    expect(rows.length).toBe(1);

    done();
  });

  it("Verify", async (done) => {
    const two = new TotpTwoFactor();

    const data = await two.setup(user);

    const token = totp({
      secret: data.secret,
      encoding: 'base32'
    });
    //Wrong
    expect(await two.verify(user, { token: "000000", userToken: data.userToken })).toBe(false, "Token Wrong token");

    //Right
    const verified = await two.verify(user, { token, userToken: data.userToken });
    expect(verified).toBe(true);

    expect(await two.verify(user, { token, userToken: data.userToken })).toBe(false, "Token already used");

    const rows = await container.db.query("SELECT * FROM `totpToken` WHERE userToken = ?", [data.userToken]);
    expect(rows[0].attempt).toBe(1);
    expect(rows[0].used).toBe(true);

    done();
  });

  it("getLatest", async (done) => {
    const two = new TotpTwoFactor();
    await two.setup(user);
    const data = await two.request(user);
    
    const latest = await two.getLatest(user);
    expect(latest.id).toBe(2);
    expect(data.expires.unix()).toBe(latest.expires.unix());
    expect(data.userToken).toBe(latest.userToken);

    done();
  });

  // it("offline test", async (done) => {
  //   const works = totp.verify({
  //     secret: "OVOV2UTBINZGKRDYHRAH2ZRSPV5FUJDCHZGCK4BXOBNGMKCDLVKQ",
  //     encoding: 'base32',
  //     token: "285831",
  //     window: 1
  //   });
    
  //   expect(works).toBe(true);

  //   done();
  // });

});