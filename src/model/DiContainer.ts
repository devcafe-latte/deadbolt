import { UserManager } from './UserManager';
import { Connection, createConnection } from 'promise-mysql';

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

  constructor(private options?: any){ 
    this.ready();
  }

  public async ready() {
    if (!this._ready) this._ready = this.init();
    return this._ready;
  }

  private async init() {
    //Setup userManager
    this._um = new UserManager();

    //Setup DB Connection
    this._db = await createConnection({
      host     : 'localhost',
      user     : 'root',
      password : 'root',
      database : 'deadbolt_test',
      typeCast: (field, next) => {
        if (field.type === 'TINY') {
          //Convert tiny ints to bools.
          return (field.string() === '1');
        } else {
          return next();
        }
      }
    });
  }
}

const container = new Container();
export default container;