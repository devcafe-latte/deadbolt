import { SqlResult } from '../model/SqlResult';
import { User } from '../model/User';
describe("Processing results", () => {
  const rows = [
    { u: { id: 1, username: 'Jack' }, m: { id: 1, app: 'some-app', role: 'admin' } },
    { u: { id: 1, username: 'Jack' }, m: { id: 3, app: 'some-app', role: 'user' } },
    { u: { id: 8, username: 'Bruce' }, m: { id: 34, app: 'some-app', role: 'user' } },
  ];

  it ("processes nested results from Mysql", () => {
    const expected = {
      u: {
        1: { id: 1, username: 'Jack' },
        8: { id: 8, username: 'Bruce' },
      },
      m: {
        1: { id: 1, app: 'some-app', role: 'admin' },
        3: { id: 3, app: 'some-app', role: 'user' },
        34: { id: 34, app: 'some-app', role: 'user' }
      }
    };

    const r = SqlResult.new(rows);
    expect(r.data).toEqual(expected);
  });

  it("tries casting", () => {
    const r = SqlResult.new(rows);
    expect(r.data.u[1].constructor.name).toBe("Object");
    expect(r.data.u[8].constructor.name).toBe("Object");
    r.cast('u', User);
    expect(r.data.u[1].constructor.name).toBe("User");
    expect(r.data.u[8].constructor.name).toBe("User");

  });
});