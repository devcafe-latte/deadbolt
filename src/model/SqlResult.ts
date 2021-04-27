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
   * @param {string} key name of the collection
   * @param {boolean} recoverOrdering Default value: `false`
   *
   * If `true`, ordering will be performed based on the ordering of `_items` array.
   *
   * > WARNING: Recovering the order is an expensive operation. Make sure that the collection you are operating with is limited/paginated.
   * @returns
   * @memberof SqlResult
   */
  array(key: string, recoverOrdering = false) {
    if (!this.data[key]) throw new Error(`Key ${key} doesn't exist.`);
    const result = [];
    const collection = this.data[key];
    for(let id in collection) {
      if (!collection.hasOwnProperty(id)) continue;
      result.push(collection[id]);
    }

    // recover the order
    if (recoverOrdering) {
      result.sort((a, b) => {
        const aIndex = this._rows.findIndex(r => r[key] && r[key].id && a.id ? r[key].id == a.id : false);
        const bIndex = this._rows.findIndex(r => r[key] && r[key].id && b.id ? r[key].id == b.id : false);
        return aIndex - bIndex;
      });
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

      //With outer joins, it's possible for id to be null.
      if (!object.id) continue;

      //Add this row to it if it didn't exist.
      if (!collection[object.id]) {
        collection[object.id] = object;
      }
    }

  }

}