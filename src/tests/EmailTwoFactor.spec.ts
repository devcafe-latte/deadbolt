import container from '../model/DiContainer';
import { twoFactorTokenType } from '../model/Settings';
import { EmailTwoFactor } from '../model/twoFactor/EmailTwoFactor';
import { User } from '../model/User';
import { TestHelper } from './TestHelper';

describe("Email Two Factor Auth", () => {
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

  it("Request uuid", async (done) => {

    container.settings.emailTwoFactorTokenType = twoFactorTokenType.uuid;
    const two = new EmailTwoFactor();
    const data = await two.request(user);
    expect(data.expires).not.toBeNull();
    expect(data.expires.constructor.name).toBe("Moment");
    expect(data.token.length).toBe(32);
    expect(data.userToken.length).toBe(32);
    expect(data.userId).toBe(user.id);

    done();
  });

  it("Request digits", async (done) => {

    container.settings.emailTwoFactorTokenType = twoFactorTokenType.digits;
    const two = new EmailTwoFactor();
    const data = await two.request(user);
    expect(data.expires).not.toBeNull();
    expect(data.expires.constructor.name).toBe("Moment");
    expect(data.userId).toBe(user.id);
    expect(data.token.length).toBe(6);
    expect(data.userToken.length).toBe(32);

    const token = Number(data.token);
    expect(isNaN(token)).toBe(false);
    expect(token).toBeGreaterThanOrEqual(100000);
    expect(token).toBeLessThanOrEqual(999999);

    done();
  });

  it("getLatest", async (done) => {

    container.settings.emailTwoFactorTokenType = twoFactorTokenType.digits;
    const two = new EmailTwoFactor();
    await two.request(user);
    const data = await two.request(user);

    const latest = await two.getLatest(user);
    expect(latest.id).toBe(2);
    expect(latest.expires.unix()).toBe(data.expires.unix());
    expect(latest.userToken).toBe(data.userToken);

    done();
  });

  it("Get Tokens", async (done) => {
    const two = new EmailTwoFactor();
    await two.request(user);
    await two.request(user);
    await two.request(user);
    await two.request(user);
    const page = await two.getTokens(0);

    expect(page.lastPage).toBe(0);
    expect(page.currentPage).toBe(0);
    expect(page.items.length).toBe(4);

    expect(page.items[0].constructor.name).toBe("EmailTwoFactorRow");

    done();
  });

  it("Verify", async (done) => {

    const two = new EmailTwoFactor();
    const data = await two.request(user);
    
    //Wrong attempt
    expect(await two.verify(user, { token: "spongbob", userToken: data.userToken })).toBe(false);

    //Correct attempt
    const verified = await two.verify(user, data);
    expect(verified).toBe(true);

    const row = await container.db.query("SELECT * FROM `emailTwoFactor` WHERE id = ?", [data.id]);

    expect(row[0].used).toBe(true);
    expect(row[0].attempt).toBe(1);

    expect(await two.verify(user, data)).toBe(false);


    done();
  });

  it("Exceed Verification Attempts", async (done) => {

    container.settings.max2faAttempts = 1

    const two = new EmailTwoFactor();
    const data = await two.request(user);

    //Wrong attempt
    expect(await two.verify(user, { token: "spongbob", userToken: data.userToken })).toBe(false);
    
    const verified = await two.verify(user, data);
    expect(verified).toBe(false);

    done();
  });

});