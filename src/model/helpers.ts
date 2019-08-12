export function toObject<T>(type: { new(): T }, data: any): T {
  const o = new type();
  for (let key in o) {
    if (!o.hasOwnProperty(key)) continue;

    if (data[key] !== undefined) o[key] = data[key];
  }
  return o;
}

export function hasProperties(object: any, properties: string[]): boolean {
  if (object === null || typeof object !== "object") return false;

  for (let p of properties) {
    if (object[p] === undefined || object[p] === null) return false;
  }

  return true;
}

export function cleanForSending(body: any, depth = 1) {
  if (depth > 5) return;

  if (typeof body !== "object" || body === null) return;  

  for (let key in body) {
    if (!body.hasOwnProperty(key)) continue;
    //Convert Moment objects to unix timestamp
    if (typeof body[key] === "object" && body[key] !== null && body[key].constructor.name === 'Moment') {
      body[key] = body[key].unix();
    } else if (typeof body[key] === "object" && body[key] !== null) {
      cleanForSending(body[key], depth + 1);
    }
  }

  //Remove id if a UUID or token is present.
  if ((body.uuid || body.token) && body.id) delete body.id;
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
    const sql = `UPDATE \`${table}\` SET ` + strings.join(', ') + " "; 
    return {sql, values};
  }  
}