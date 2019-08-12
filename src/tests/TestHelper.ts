import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createConnection } from 'promise-mysql';

import container from '../model/DiContainer';

export class TestHelper {
  constructor() { }

  public static setTestEnv() {
    //Set some test settings (these don't overwrite. So if they are already set, that's good too)
    dotenv.config({ "path": __dirname + '/resources/.env' });
  }

  private async init() {
    TestHelper.setTestEnv();
    if (!process.env.DB_NAME.endsWith('_test')) {
      throw new Error("That doesn't look like a test database to me! Should end in '_test'");
    }

    //Reset the database
    const connection = await createConnection({
      host     : process.env.DB_HOST,
      user     : process.env.DB_USER,
      password : process.env.DB_PASS,
      database : process.env.DB_NAME,
      port     : Number(process.env.DB_PORT),
      multipleStatements: true
    });
    await connection.query(readFileSync(__dirname + "/resources/fixture.sql").toString());

    //Make the container happen
    await container.ready();
  }

  static async new(): Promise<TestHelper> {
    const t = new TestHelper();
    await t.init();
    return t;
  }
}