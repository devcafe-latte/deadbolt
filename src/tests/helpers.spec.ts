import moment from 'moment';

import { SqlHelper, stripComplexTypes, toObject, cleanForSending, hasProperties } from '../model/helpers';
import { User } from '../model/User';
import uuidv4 from 'uuid/v4';

describe('Helpers', function() {

  it("Tests hasProperties", () => {
    const props = ["name", "email"];
    const o1 = { name: "Patrick", email: "mrfancypants@bikinibottom.com", score: 100 };
    const o2 = { name: null, email: "mrfancypants@bikinibottom.com" };
    const o3 = { name: "Patrick" };

    expect(hasProperties(o1, props)).toBe(true);
    expect(hasProperties(o2, props)).toBe(false);
    expect(hasProperties(o3, props)).toBe(false);
  });

  it('Tests toObject', () => {
    const user = toObject<User>(User, {id: 1, firstName: 'coo'});
    expect(user.firstName).toBe('coo');
    expect(user.id).toBe(1);
  }); 

  it("tests transform Moments", () => {
    const input: any = {
      foo: "bar",
      baz: { id: 14 },
      date: moment()
    };

    const expected = {
      foo: "bar",
      baz: { id: 14 },
      date: input.date.unix()
    };

    cleanForSending(input);
    
    expect(expected).toEqual(input);
  });

  it("tests transform Id", () => {
    let input: any = { id: 3, uuid: uuidv4() };

    cleanForSending(input);
    
    expect(input.id).toBeUndefined("Uuid is present, so id gets removed.");
    expect(input.uuid).toBeDefined("uuid gets to stay.");
  });

  it("tests transform Id 2", () => {
    let input: any = { id: 3, some: "value" };

    cleanForSending(input);
    
    expect(input.id).toBeDefined("No uuid, so id should stay.");
  });

  it("tests transform deep", () => {
    let input: any = { name: "peter", uuid: uuidv4(), a: { b: { c: { id: 1, uuid: uuidv4(), created: moment() } } } };

    cleanForSending(input);
    
    expect(input.uuid).toBeDefined("uuid gets to stay.");
    expect(input.a.b.c.uuid).toBeDefined("uuid gets to stay.");
    expect(input.a.b.c.id).toBeUndefined("id should be cleared");
    expect(isNaN(input.a.b.c.created)).toBe(false, "Should be a number now.");
  });

  it("tests transform nulls", () => {
    let input: any = { id: 3, some: null };

    cleanForSending(input);
    
    expect(input.some).toBe(null);
  });

  it('Tests stripComplexTypes', () => {
    const foo = {
      id: 1,
      someArray: [1, 2 ,3],
      someObject:{ bar: "baz" },
      name: "a string",
      nothing: null
    };

    const stripped = stripComplexTypes(foo);
    expect(stripped.id).toBe(1);
    expect(stripped.name).toBe("a string");
    expect(stripped.someArray).toBeUndefined();
    expect(stripped.someObject).toBeUndefined();
    expect(stripped.nothing).toBeUndefined();

    const keepNulls = stripComplexTypes(foo, true);
    expect(keepNulls.nothing).toBe(null);
  }); 

  it("test SqlHelper", () => {
    const result = SqlHelper.update('user', {id: 1, firstName: 'coo', passwordHash: '1234567890'});
    expect(result.sql).toEqual("UPDATE `user` SET id = ?, firstName = ?, passwordHash = ? ");
    expect(result.values).toEqual([1, 'coo', '1234567890']);
  });
});

