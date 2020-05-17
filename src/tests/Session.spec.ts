import { Session } from '../model/Session';

describe ("Session Tests", () => {
  it ("To db", () => {
    const s = new Session();
    s.id = 1;
    s.token = "123";

    const expected = {
      id: s.id,
      token: s.token,
    };

    expect(s.toDb()).toEqual(expected);
  });

  it ("From db", () => {
    const row = {
      id: 2,
      token: "12345terfds"
    };

    const session = Session.fromDb(row);
    
    expect(session.id).toBe(row.id);
    expect(session.token).toBe(row.token);
  });
});