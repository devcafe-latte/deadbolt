import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { Connection, createConnection } from 'promise-mysql';

import { UserManager } from './UserManager';

export class Container {
  private _ready: Promise<void>;

  private _um: UserManager;
  get um() {
    if (!this._um) throw new Error("Container still starting up... (Maybe await ready() first.");
    return this._um;
  }

  private _db: Connection;
  get db() {
    if (!this._db) throw new Error("Container still starting up... (Maybe await ready() first.");
    return this._db;
  }

  debug: boolean;

  constructor() { }

  public async ready() {
    if (!this._ready) this._ready = this.init();
    return this._ready;
  }

  private async init() {
    //Load dotenv file if any.
    if (existsSync('.env')) dotenv.config(); //todo see if this works.

    //Set debug mode.
    this.debug = (process.env.NODE_ENV !== "production");

    //Setup userManager
    this._um = new UserManager();

    //Setup DB Connection
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'deadbolt',
      port: Number(process.env.DB_PORT) || 3306,
      typeCast: (field, next) => {
        if (field.type === 'TINY') {
          //Convert tiny ints to bools.
          return (field.string() === '1');
        } else {
          return next();
        }
      }
    }
    try {
      this._db = await createConnection(config);
    } catch (err) {

      console.error("Can't connect to database! Shutting down...");
      console.error(`Tried connecting to '${config.host}' with user '${config.user}'\n\n`);
      console.error(err);

      process.exit(1);
    }
  }
}

const container = new Container();
export default container;