import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createConnection } from 'promise-mysql';

import container from '../model/DiContainer';
import { Settings } from '../model/Settings';

export class TestHelper {
  constructor() { }

  public static setTestEnv() {
    //Set some test settings (these don't overwrite. So if they are already set, that's good too)
    dotenv.config({ "path": __dirname + '/resources/.env' });
  }

  async shutdown() {
    await container.shutdown();
  }

  private async init() {
    TestHelper.setTestEnv();
    const s = new Settings();

    if (!s.dbName.endsWith('_test')) {
      throw new Error("That doesn't look like a test database to me! Should end in '_test'");
    }

    //Reset the database
    const connection = await createConnection({
      host     : s.dbHost,
      user     : s.dbUser,
      password : s.dbPass,
      database : s.dbName,
      port     : s.dbPort,
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