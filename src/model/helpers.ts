import { isNumber, isString } from "util";

export function isValidEmail(email: string) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

export function getIdentifierType(identifier: any): string {
  if (isNumber(identifier)) return "id";

  if (!isString(identifier)) return "unknown"

  if (isValidEmail(identifier)) return "email";

  if (identifier.split("-").length === 5) return "uuid";

  return "username";
}

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

export function hasProperty(object: any, property: string): boolean {
  return hasProperties(object, [property])
}

export function trimCharLeft(input: string, char = ','): string {
  if (input[0] === char) return trimCharLeft(input.substring(1), char);

  return input;
}

export function cleanForSending(body: any, depth = 1) {
  if (depth > 5) return;

  if (typeof body !== "object" || body === null) return;  

  for (let key in body) {
    if (!body.hasOwnProperty(key)) continue;
    //Convert Moment objects to unix timestamp
    if (typeof body[key] === "object" && body[key] !== null && body[key].constructor.name === 'Moment') {
      body[key] = body[key].unix();
    } else if (typeof body[key] === "object" && body[key] !== null && body[key].constructor.name === 'SearchCriteria') {
      body[key] = body[key].toClient();
    } else if (typeof body[key] === "object" && body[key] !== null) {
      cleanForSending(body[key], depth + 1);
    }
  }

  //Remove id if a UUID or token is present.
  if ((body.uuid || body.token) && body.id) delete body.id;
  if (body.userId) delete body.userId;
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