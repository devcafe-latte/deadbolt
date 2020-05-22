import { Settings } from './Settings';
import { Connection, createConnection } from 'promise-mysql';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
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
    this._con.destroy();
    this._con = undefined;
  }

  async seed() {
    console.log("Checking for Database: " + this.settings.dbName);

    //Create connection
    const c = await this.getConnection();

    //Check if database exists
    if (await this.dbExists(this.settings.dbName)) return;

    console.log("Seeding Deadbolt Database: " + this.settings.dbName);

    //Seed it
    let sql = readFileSync(__dirname + "/../../migrations/seed/deadbolt-seed.sql").toString();
    sql = sql.replace(/(DEADBOLT_DB_NAME)/g, this.settings.dbName);
    await c.query(sql);

    //Migrate
    execSync("npx db-migrate up");

    this.close();

    if (!await this.dbExists(this.settings.dbName)) throw new Error("Seeding failed");
  }

  private async getConnection(): Promise<Connection> {
    if (!this._con) {
      //Reset the database
      this._con = await createConnection({
        host: this.settings.dbHost,
        user: this.settings.dbUser,
        password: this.settings.dbPass,
        port: this.settings.dbPort,
        multipleStatements: true
      });
    }

    return this._con;
  }


}