export class SqlResult {
  private _rows: any[];
  data: any = {};

  cast(key: string, type) {
    if (!this.data[key]) throw new Error(`Key ${key} doesn't exist.`);

    if (typeof type.fromDb !== 'function') throw new Error("No fromDb() function on type.");

    const collection = this.data[key];

    for(let id in collection) {
      if (!collection.hasOwnProperty(id)) continue;
      collection[id] = type.fromDb(collection[id]);
    }
  }

  /**
   * Returns a collection as an array.
   *
   * @param {string} key name of the follection
   * @returns
   * @memberof SqlResult
   */
  array(key: string) {
    if (!this.data[key]) throw new Error(`Key ${key} doesn't exist.`);
    const result = [];
    const collection = this.data[key];
    for(let id in collection) {
      if (!collection.hasOwnProperty(id)) continue;
      result.push(collection[id]);
    }

    return result;
  }

  static new (rows: any[]): SqlResult {
    const s = new SqlResult();
    s._rows = rows;
    s.group();

    return s;
  }

  private group() {
    this.data = {};
    for (let r of this._rows){
      this.processRow(r);
    }
  }

  private processRow(row: any) {
    for (let key in row) {
      if (!row.hasOwnProperty(key)) continue;

      //Create the object collection if it didn't exist
      if (!this.data[key]) {
        this.data[key] = {};
      }
      const collection = this.data[key];
      const object = row[key];
      
      if (!object.id) throw new Error("I need an id to group stuff...");

      //Add this row to it if it didn't exist.
      if (!collection[object.id]) {
        collection[object.id] = object;
      }
    }

  }

}