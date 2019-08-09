import { toObject, SqlHelper, stripComplexTypes } from '../model/helpers';
import { User } from '../model/User';
describe('Helpers', function() {
  
  it('Tests toObject', () => {
    const user = toObject<User>(User, {id: 1, firstName: 'coo'});
    expect(user.firstName).toBe('coo');
    expect(user.id).toBe(1);
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
    expect(result.sql).toEqual("UPDATE `user` SET id = ?, firstName = ?, passwordHash = ?");
    expect(result.values).toEqual([1, 'coo', '1234567890']);
  });
});

