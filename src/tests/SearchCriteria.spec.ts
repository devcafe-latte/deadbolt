import { SearchCriteria } from '../model/SearchCriteria';

describe('SearchCriteria', () => {
  it("Tests fromQueryParams", () => {

    const params = {
      q: 'foo',
      orderBy: ['+id', '-firstName', 'lastName']
    };

    const s = SearchCriteria.fromQueryParams(params);
    expect(s.page).toBe(0);
    expect(s.perPage).toBe(25);
    expect(s.q).toBe('foo');
    expect(s.orderBy.length).toBe(3);

    expect(s.orderBy[0]).toEqual({ column: 'id', desc: false });
    expect(s.orderBy[1]).toEqual({ column: 'firstName', desc: true });
    expect(s.orderBy[2]).toEqual({ column: 'lastName', desc: false });
  });

  it("Tests fromQueryParams2", () => {

    const params = {
      q: 'foo',
      orderBy: '+id'
    };

    let s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: 'id', desc: false });

    params.orderBy = "-id";
    s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: 'id', desc: true });

    params.orderBy = "id";
    s = SearchCriteria.fromQueryParams(params);
    expect(s.orderBy.length).toBe(1);
    expect(s.orderBy[0]).toEqual({ column: 'id', desc: false });
  });

  it("Tests ids and memberships", () => {

    const params: any = {
      q: 'foo',
      uuids: "1234",
      memberships: "support"
    };

    let s = SearchCriteria.fromQueryParams(params);
    expect(s.uuids.length).toBe(1);
    expect(s.memberships.length).toBe(1);
    
    params.uuids = ["111", "222", "333"];
    params.memberships = ["support", "user"];

    s = SearchCriteria.fromQueryParams(params);
    expect(s.uuids.length).toBe(3);
    expect(s.memberships.length).toBe(2);

  });
});

describe("Search Sql Builder", () => {
  it("gets full query", () => {
    const params = {
      q: 'foo',
      uuids: ["111", "222"],
      memberships: "support",
      orderBy: ['id', 'lastName'],
      perPage: 10,
      page: 4,
    };

    const builder = SearchCriteria.fromQueryParams(params).getSqlBuilder();

    expect(builder.getFrom()).toBe("FROM `user` u LEFT OUTER JOIN `membership` m ON `u`.`id` = `m`.`userId`");
    expect(builder.getWhere()).toBe("WHERE (u.email LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)\nAND u.uuid IN (?)\nAND m.role IN (?)");
    expect(builder.getOrderBy()).toBe("ORDER BY ?? ASC, ?? ASC");
    expect(builder.getLimit()).toBe("LIMIT ? OFFSET ?");

    expect(builder.values).toEqual(['foo%', 'foo%', 'foo%', ['111', '222'], ['support'], 'id', 'lastName', 10, 40]);
    
  
  });

  it("gets minimal query", () => {
    const params = { };
    const builder = SearchCriteria.fromQueryParams(params).getSqlBuilder();

    const sql = builder.getSql();

    const expectedSql = "SELECT * FROM `user` u LEFT OUTER JOIN `membership` m ON `u`.`id` = `m`.`userId`  ORDER BY ?? ASC LIMIT ? OFFSET ?";

    expect(sql.sql).toBe(expectedSql);
    expect(sql.values).toEqual(['u.id', 25, 0]);
  });

  it("gets minimal query, no limit", () => {
    const params = { };
    const builder = SearchCriteria.fromQueryParams(params).getSqlBuilder();

    const sql = builder.getSql("SELECT *", false);

    const expectedSql = "SELECT * FROM `user` u LEFT OUTER JOIN `membership` m ON `u`.`id` = `m`.`userId`  ORDER BY ?? ASC ";

    expect(sql.sql).toBe(expectedSql);
    expect(sql.values).toEqual(['u.id']);
  });
});