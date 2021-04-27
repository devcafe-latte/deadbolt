import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { ConnectionConfig } from 'mysql';
import { Connection, createConnection } from 'promise-mysql';

import { Deferred } from './Deferred';
import { Settings } from './Settings';

export class Seeder {
  private _con: Connection;

  constructor(private settings: Settings) {

  }

  async dbExists(name: string): Promise<boolean> {
    const c = await this.getConnection();

    const rows = await c.query("SHOW DATABASES LIKE ?;", [name]);
    return (rows.length > 0);
  }

  async close() {
    if (!this._con) return;

    await this._con.end();
    this._con = undefined;
  }

  async seed() {
    //Create connection
    const c = await this.waitForDb();

    //Check if database exists
    if (await this.dbExists(this.settings.dbName)) {
      await this.close();
      return;
    }

    console.log("Seeding Deadbolt Database: " + this.settings.dbName);

    //Seed it
    let sql = readFileSync(__dirname + "/../../migrations/seed/deadbolt-seed.sql").toString();
    sql = sql.replace(/(DEADBOLT_DB_NAME)/g, this.settings.dbName);
    await c.query(sql);

    //Migrate
    execSync("npx db-migrate up");

    await this.close();

    if (!await this.dbExists(this.settings.dbName)) throw new Error("Seeding failed");
  }

  private async getConnection(): Promise<Connection> {
    if (!this._con) {
      const config: ConnectionConfig = {
        host: this.settings.dbHost,
        user: this.settings.dbUser,
        password: this.settings.dbPass,
        port: this.settings.dbPort,
        multipleStatements: true
      };

      //Add ssl
      if (this.settings.dbUseSsl) {
        config.ssl = { ca: readFileSync(this.settings.dbCaPath, { encoding: 'utf8' }) };
      }
      this._con = await createConnection(config);
    }

    return this._con;
  }

  private async waitForDb() {

    const interval = 1500;
    const maxTries = 15;

    const d = new Deferred<Connection>();
    let current = 0;
    const int = setInterval(() => {

      current++;
      console.log(`Attempting to connect to Database (${current})`);

      this.getConnection()
        .then(con => {
          clearInterval(int);
          d.resolve(con);
        })
        .catch(err => {
          if (current >= maxTries) {
            clearInterval(int);
            d.reject(err);
          }
        });

    }, interval);

    return d.promise;
  }

}