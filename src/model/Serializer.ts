import moment from 'moment';

export class Serializer {
  static deserialize<T>(type: { new(): T }, data: any, mapping: ObjectMapping = {}): T {
    if (data === null || data === undefined) return null;
    
    const o = new type();
    for (let key in o) {
      if (!o.hasOwnProperty(key)) continue;
      if (data[key] === undefined) continue;
  
      o[key] = Serializer.mapValue(data[key], mapping[key]);
    }
  
    return o;
  }
  
  private static mapValue(value: any, action: string | Function): any {
    //No mapping
    if (!action) return value;
  
    //Don't do nulls and undefined.
    if (value === null || value === undefined) return value;
  
    //Function
    if (typeof action === "function") return action(value);
  
    //Possible string values: Moment 
    const lower = action.toLowerCase();
    if (lower === "moment") return moment.unix(value);
  
    if (lower === "number") return Number(value);
  
    //Add more special cases here
  
    console.error("Unknown action", action);
    throw "Unknown action";
  }

  static serialize(input: any, maxDepth = 10, currentDepth = 0) {
    if (currentDepth > maxDepth) return input;

    //Traverse input 
    // Array? recursive call
    // Moment? call unix()
    // serialize? call serialize()
    // object? recursive call

    let result: any;
    if (Array.isArray(input)) {
      result = [];
      for (let i of input) {
        result.push(Serializer.serialize(i, maxDepth, currentDepth + 1));
      }
      return result;
    } else if (typeof input === "object" && input !== null) {
      const className = input.constructor.name;

      if (className === 'Moment') return input.unix();
      if (typeof input.serialize === "function") return input.serialize();

      result = {};
      for (let k in input) {
        if (!input.hasOwnProperty(k)) continue;
        result[k] = Serializer.serialize(input[k], maxDepth, currentDepth + 1);
      }
      return result;
    } else {
      return input;
    }
  }
}

export interface ObjectMapping {
  [prop: string]: string | Function;
}