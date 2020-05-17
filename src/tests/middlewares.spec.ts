import { userMiddleware } from '../model/middlewares';
import { TestHelper } from './TestHelper';

describe("userMiddleware", () => {
  let req: any;
  let res: any;
  let th: TestHelper;

  beforeEach(async (done) => {
    req = { body: {}, params: {} };
    res = {
      statusCode: 200,
      body: undefined,
      status: (value: number) => {
        res.statusCode = value;
        return res;
      },
      send: (value: any) => {
        res.body = value;
        return res;
      }
    };

    th = await TestHelper.new();
    done();
  });

  afterEach(async (done) => {
    await th.shutdown();
    done();
  });

  it("Tests Missing Identifier", async (done) => {
    await userMiddleware(req, res, () => {
      throw new Error("Should not invoke next()");
    });

    expect(req.body.identifier).toBeUndefined();
    expect(req.params._identifier).toBeUndefined();
    expect(req.params._user).toBeUndefined();

    expect(res.statusCode).toBe(400);
    expect(res.body.reason).toEqual("Missing identifier");
    done();
  });

  it("Tests wrong Identifier", async (done) => {
    req.body.identifier = "notauser";

    await userMiddleware(req, res, () => {
      throw new Error("Should not invoke next()");
    });

    expect(req.body.identifier).toEqual("notauser");
    expect(req.params._identifier).toEqual("notauser");
    expect(req.params._user).toBe(null);

    expect(res.statusCode).toBe(404);
    expect(res.body.reason).toEqual("User not found");
    done();
  });

  it("Tests Identifier as param", async (done) => {
    req.params.identifier = "Co";
    let next = false;

    await userMiddleware(req, res, () => {
      next = true;
    });

    expect(next).toBe(true);

    expect(req.params._identifier).toEqual("Co");
    expect(req.params._user.id).toBe(1);

    expect(res.statusCode).toBe(200);
    done();
  });

  it("Tests name as Identifier in body", async (done) => {
    req.body.identifier = "Co";
    let next = false;

    await userMiddleware(req, res, () => {
      next = true;
    });

    expect(next).toBe(true);

    expect(req.params._identifier).toEqual("Co");
    expect(req.params._user.id).toBe(1);

    expect(res.statusCode).toBe(200);
    done();
  });

  it("Tests id as Identifier", async (done) => {
    req.body.identifier = 1;
    let next = false;

    await userMiddleware(req, res, () => {
      next = true;
    });

    expect(next).toBe(true);

    expect(req.params._identifier).toEqual(req.body.identifier);
    expect(req.params._user.id).toBe(1);

    expect(res.statusCode).toBe(200);
    done();
  });

  it("Tests uuid as Identifier", async (done) => {
    req.body.identifier = "ee13624b-cf22-4597-adb9-bfa4b16baa71";
    let next = false;

    await userMiddleware(req, res, () => {
      next = true;
    });

    expect(next).toBe(true);

    expect(req.params._identifier).toEqual(req.body.identifier);
    expect(req.params._user.id).toBe(1);

    expect(res.statusCode).toBe(200);
    done();
  });

  it("Tests email as Identifier", async (done) => {
    req.body.identifier = "jordan@example.com";
    let next = false;

    await userMiddleware(req, res, () => {
      next = true;
    });

    expect(next).toBe(true);

    expect(req.params._identifier).toEqual(req.body.identifier);
    expect(req.params._user.id).toBe(2);

    expect(res.statusCode).toBe(200);
    done();
  });


});