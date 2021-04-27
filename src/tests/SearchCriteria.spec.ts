import { SearchCriteria } from '../model/SearchCriteria';

describe('SearchCriteria', () => {
  it("Tests fromQueryParams 1", () => {

    const params = {
      q: 'foo',
      orderBy: ['+email', '-first-name', 'last-name']
    };

    const s = SearchCriteria.fromQueryParams(params);
    expect(s.page).toBe(0);
    expect(s.perPage).toBe(25);
    expect(s.q).toBe('foo');
    expect(s.orderBy.length).toBe(3);

    expect(s.orderBy[0]).toEqual({ column: '`u`.`email`', desc: false });
    expect(s.orderBy[1]).toEqual({ column: '`u`.`firstName`', desc: true });
    expect(s.orderBy[2]).toEqual({ column: '`u`.`lastName`', desc: false });
  });

  it("Tests fromQueryParams 2", () => {

    const params = {
      q: 'foo',
      orderBy: '+email'
    };

    let s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: '`u`.`email`', desc: false });

    params.orderBy = "-email";
    s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: '`u`.`email`', desc: true });

    params.orderBy = "email";
    s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: '`u`.`email`', desc: false });
  });

  it("Tests fromQueryParams memberships 1", () => {

    const params = {
      membership: ["first-app:first-role", "second-app:second-role"]
    };

    const s = SearchCriteria.fromQueryParams(params);
    expect(s.memberships.length).toBe(2);
    expect(s.memberships[0].app).toBe('first-app');
    expect(s.memberships[0].role).toBe('first-role');

    expect(s.memberships[1].app).toBe('second-app');
    expect(s.memberships[1].role).toBe('second-role');

  });

  it("Tests fromQueryParams memberships 2", () => {

    const params = {
      membership: ['"first:app":"first:role"', '"second:app":"second:role"']
    };

    const s = SearchCriteria.fromQueryParams(params);
    expect(s.memberships.length).toBe(2);
    expect(s.memberships[0].app).toBe('first:app');
    expect(s.memberships[0].role).toBe('first:role');

    expect(s.memberships[1].app).toBe('second:app');
    expect(s.memberships[1].role).toBe('second:role');

  });

  it("Tests ids and memberships", () => {

    const params: any = {
      q: 'foo',
      uuids: "1234",
      memberships: [ {app: 'some-app', role: 'some-role' } ]
    };

    let s = SearchCriteria.fromQueryParams(params);
    expect(s.uuids.length).toBe(1);
    expect(s.memberships.length).toBe(1);
    expect(s.memberships[0].role).toBe("some-role");
    expect(s.memberships[0].app).toBe("some-app");
    
    params.uuids = ["111", "222", "333"];
    params.memberships = [ 
      {app: 'some-app', role: 'some-role' },
      {app: 'some-app', role: 'some-other-role' } 
    ];

    s = SearchCriteria.fromQueryParams(params);
    expect(s.uuids.length).toBe(3);
    expect(s.memberships.length).toBe(2);
    expect(s.memberships[1].role).toBe("some-other-role");
    expect(s.memberships[1].app).toBe("some-app");

  });
});