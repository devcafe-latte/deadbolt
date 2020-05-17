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
    const data = await two.request(user);
    expect(data.message).toContain("Use Authenticator App");

    done();
  });

  it("Setup", async (done) => {

    const two = new TotpTwoFactor();
    const data = await two.setup(user);
    expect(data.secret.length).toBe(52);
    expect(data.otpAuthUrl).toBeDefined();
    expect(data.userId).toBe(user.id);

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
    const verified = await two.verify(user, { token });

    expect(verified).toBe(true);

    expect(await two.verify(user, { token: "000000" })).toBe(false, "Token incorrect");

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