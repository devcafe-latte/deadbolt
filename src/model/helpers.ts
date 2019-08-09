export function toObject<T>(type: { new(): T }, data: any): T {
  const o = new type();
  for (let key in o) {
    if (!o.hasOwnProperty(key)) continue;

    if (data[key] !== undefined) o[key] = data[key];
  }
  return o;
}

export function stripComplexTypes(object: any, keepNulls = false) {
  let clone = {...object};

  for (let key in clone) {
    if (!clone.hasOwnProperty(key)) continue;

    if (!keepNulls && (clone[key] === null || clone[key] === undefined)) {
      delete clone[key];
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      delete clone[key];
    }
  }
  return clone;
}

export class SqlHelper {
  public static update(table: string, object: any) {
    const strings = [];
    const values = [];
    for (let key in object) {
      if (!object.hasOwnProperty(key)) continue;
      strings.push(key + " = ?");
      values.push(object[key]);
    }
    const sql = `UPDATE \`${table}\` SET ` + strings.join(', '); 
    return {sql, values};
  }

  
}