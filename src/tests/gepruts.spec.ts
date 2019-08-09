import * as jwt from 'jsonwebtoken';
import fs from 'fs';

describe("Random nonsense", () => {
  it("puts the lotion in the basket", async () => {
    //this is how you create a JWT.
    const data = {
      user_id: 1
    };
    const token = jwt.sign(data, "password", {expiresIn: '2 days', issuer: "deadbolt", audience: "tests"});
    expect(token).toBeDefined();
  });

  it("puts the assymetric lotion in the basket", async () => {
    //note: It you haven't already, create a key pair and place them under src/test/resources/test-jwt.key[.pub]
    // https://gist.github.com/ygotthilf/baa58da5c3dd1f69fae9 

    //this is how you create a JWT with a key pair.
    const data = {
      user_id: 1
    };
    const privateKey = fs.readFileSync(__dirname + "/resources/test-jwt.key");
    const token = jwt.sign(data, privateKey, { expiresIn: '2 days', issuer: "deadbolt", audience: "tests", algorithm: "RS256" });
    expect(token).toBeDefined("There should be a token!");

    const publicKey = fs.readFileSync(__dirname + "/resources/test-jwt.key.pub");
    const decoded = jwt.verify(token, publicKey);
    expect(decoded).toBeDefined();
  });
});