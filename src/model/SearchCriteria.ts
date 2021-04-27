import { toObject, trimCharLeft } from './helpers';
import { Membership } from './Membership';

export class SearchCriteria {
  q?: string = null;
  email?: string = null;
  uuids?: string[] = null;

  memberships?: Membership[] = null;
  page: number = 0;
  perPage: number = 25;
  orderBy: OrderByCriteria[] = [/*{ column: 'u.email' }*/];

  static fromQueryParams(params: any): SearchCriteria {
    const s = toObject<SearchCriteria>(SearchCriteria, params);

    if (params.page) s.page = Number(params.page);
    if (params.perPage) s.perPage = Number(params.perPage);

    s.setOrderBy(params.orderBy);

    if (typeof params.uuids === "string") s.uuids = [params.uuids];
    if (params.membership) s.memberships = s.decodeMemberships(params.membership);

    return s;
  }

  private decodeMemberships(data: string|string[]) {
    //Memberships come in like: ?membership=some-app:some-role&membership=some-other-app:some-other-role
    //    or: ?membership="some:app":"some:role"&membership="some-other-app":"some-other-role"
    if (!data) return null;
    if (!Array.isArray(data)) data = [data];
    const memberships = [];

    const regex = /(:)(?=(?:[^"]|"[^"]*")*$)/g;
    for (let d of data) {

      const parts = d.split(regex)
        .filter(p => p !== ':')
        .map(p => p.replace(/^"|"$/g, ''));

      memberships.push({ app: parts[0], role: parts[1]});
    }

    return memberships;
  }

  private setOrderBy(data: string | string[]) {
    if (!data) return;

    //Normalize
    if (typeof data === "string") data = [data];

    this.orderBy = [];
    for (let d of data) {
      const orderBy: OrderByCriteria = { column: d };
      orderBy.desc = d[0] === '-';
      orderBy.column = trimCharLeft(orderBy.column, '-');
      orderBy.column = trimCharLeft(orderBy.column, '+');
      this.orderBy.push(orderBy);
    }
  }

  getSqlBuilder(): SearchSqlBuilder {
    return new SearchSqlBuilder(this);
  }

  toClient() {
    const data: any = { ...this };
    data.orderBy = this.orderBy.map(o => o.desc ? '-' + o.column : o.column);
    return data;
  }
}

export interface OrderByCriteria {
  column: string;
  desc?: boolean;
}

export class SearchSqlBuilder {
  values = [];

  constructor(private search: SearchCriteria) {

  }

  getSql(select: string = "SELECT *", addLimit = true, addOrderBy = true) {
    this.values = [];
    const sql = `${select} ${this.getFrom()} ${this.getWhere()} ${addOrderBy ? this.getOrderBy({ isIntegrated: true}).sql: ''} ${addLimit ? this.getLimit() : ''}`;
    return { sql, values: this.values };
  }

  getFrom() {
    return "FROM `user` u LEFT OUTER JOIN `membership` m ON `u`.`id` = `m`.`userId`";
  }

  getWhere(): string {
    const whereArray = [];
    if (this.search.q) {
      const searchValue = this.search.q + "%";
      whereArray.push(
        [
          "(u.email LIKE ?",
          "u.firstName LIKE ?",
          "u.lastName LIKE ?)"
        ].join(" OR ")
      );
      this.values.push(searchValue, searchValue, searchValue);
    } else if (this.search.email) {
      const searchValue = this.search.email + "%";
      whereArray.push("(u.email LIKE ?)");
      this.values.push(searchValue);
    }

    if (this.search.uuids && this.search.uuids.length > 0) {
      whereArray.push('u.uuid IN (?)');
      this.values.push(this.search.uuids);
    }

    if (this.search.memberships && this.search.memberships.length > 0) {
      const msWhere = [];
      for (let m of this.search.memberships) {
        msWhere.push('(`m`.`app` = ? AND `m`.`role` = ?)');
        this.values.push(m.app, m.role);
      }
      whereArray.push('(' + msWhere.join(' OR ') + ')');
    }
    const where = whereArray.length > 0 ? "WHERE " + whereArray.join("\nAND ") : "";

    return where;
  }

  getLimit() {
    const offset = this.search.page * this.search.perPage;
    this.values.push(this.search.perPage, offset);
    return "LIMIT ? OFFSET ?";
  }

  getOrderBy(opts: GetOrderByOptions = { isIntegrated: false }): SqlAndValuesDto {
    const result: SqlAndValuesDto = {
      sql: '',
      values: []
    };

    if (this.search.orderBy.length === 0) return result;

    const orderArray = [];

    for (let o of this.search.orderBy) {
      orderArray.push(`?? ${o.desc ? 'DESC' : 'ASC'}`);
      opts.isIntegrated ? this.values.push(o.column) : result.values.push(o.column);
    }

    result.sql = 'ORDER BY ' + orderArray.join(', ');

    return result;
  }

}

export interface GetOrderByOptions {
  /**
   * If `true` this method will modify internal properties (used as a part of an integrated function `getSql`).
   * If `false`, it returns a clean object containing the sql and values without modifying the internal properties.
   * Set this property to `false` when ever you need a clean output of this function which can be used in custom sql.
   *
   * Default is `false`.
   */
  isIntegrated?: boolean;
}

export interface SqlAndValuesDto {
  sql: string;
  values: any[]
}