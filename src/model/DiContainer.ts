import { Database, DbConfig } from 'cereal-bowl';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { createPool, Pool, PoolConfig } from 'promise-mysql';

import { Seeder } from './Seeder';
import { Settings } from './Settings';
import { UserManager } from './UserManager';

export class Container {
  private _ready: Promise<void>;

  private _um: UserManager;
  get um() {
    if (!this._um) throw new Error("Container still starting up... (Maybe await ready() first.");
    return this._um;
  }


  private _db: Database;
  get db(): Database {
    if (!this._db) throw new Error("Container still starting up... (Maybe await ready() first.");
    return this._db;
  }


  // /** @deprecated */
  // private _oldDb: Pool;
  // /** @deprecated */
  // get oldDb() {
  //   if (!this._oldDb) throw new Error("Container still starting up... (Maybe await ready() first.");
  //   return this._oldDb;
  // }

  get debug(): boolean {
    return this.settings.debug;
  }

  settings: Settings;

  constructor() { }

  public async ready() {
    if (!this._ready) this._ready = this.init();
    return this._ready;
  }

  public async shutdown() {
    // await this._oldDb.end();
    // this._oldDb = null;
    await this._db.shutdown();
    this._db = null;
    this._um = null;
    this._ready = null;
  }

  private async init() {
    //Load dotenv file if any.
    if (existsSync('.env')) dotenv.config();

    this.settings = new Settings();

    //Setup userManager
    this._um = new UserManager();

    if (this.settings.seed) await this.trySeed();

    //Setup DB Connection
    const config: DbConfig = {
      connectionLimit: 10,
      host: this.settings.dbHost,
      user: this.settings.dbUser,
      password: this.settings.dbPass,
      database: this.settings.dbName,
      port: this.settings.dbPort || 3306,

      typeCast: (field: any, next) => {
        if (field.type === 'TINY') {
          //Convert tiny ints to bools.
          return (field.string() === '1');
        } else {
          return next();
        }
      }
    }

    //Add ssl
    if (container.settings.dbUseSsl) {
      config.ssl = { ca: readFileSync(container.settings.dbCaPath, { encoding: 'utf8' }) };
    }

    try {
      // this._oldDb = await createPool(oldConfig);
      this._db = new Database(config);
      await this._db.ready();
    } catch (err) {
      console.error("Can't connect to database! Shutting down...");
      console.error(`Tried connecting to '${config.host}' with user '${config.user}'\n\n`);
      console.error(err);

      process.exit(1);
    }
  }

  private async trySeed() {
    const s = new Seeder(this.settings);
    await s.seed();
  }
}

const container = new Container();
export default container;