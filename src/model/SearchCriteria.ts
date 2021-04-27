import { toObject, trimCharLeft } from './helpers';
import { Membership } from './Membership';

export class SearchCriteria {
  q?: string = null;
  email?: string = null;
  uuids?: string[] = null;

  memberships?: Membership[] = null;
  page: number = 0;
  perPage: number = 25;
  orderBy: OrderByCriteria[] = [{ column: OrderByValue.EMAIL }];

  static fromQueryParams(params: any): SearchCriteria {
    const s = toObject<SearchCriteria>(SearchCriteria, params);

    if (params.page) s.page = Number(params.page);
    if (params.perPage) s.perPage = Number(params.perPage);

    s.setOrderBy(params.orderBy);

    if (typeof params.uuids === "string") s.uuids = [params.uuids];
    if (params.membership) s.memberships = s.decodeMemberships(params.membership);

    return s;
  }

  private decodeMemberships(data: string | string[]) {
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

      memberships.push({ app: parts[0], role: parts[1] });
    }

    return memberships;
  }

  /**
   * 
   * @param data e.g.: email, +username, -first-name 
   * @returns 
   */
  private setOrderBy(data: string | string[]) {
    if (!data) return;

    //Normalize
    if (typeof data === "string") data = [data];

    this.orderBy = [];
    for (let d of data) {
      //Possible values are: email, +email, -email
      const desc = Boolean(d[0] === '-');
      const property = String(d.replace(/^(\+|-)/, ''));
      const column = orderByColumns[property];
      if (!column) continue;

      this.orderBy.push({ column, desc });
    }
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

export enum OrderByValue {
  EMAIL = 'email',
  FIRST_NAME = 'first-name',
  LAST_NAME = 'last-name',
  CREATED = 'created',
  LAST_ACTIVITY = 'last-activity',
  USERNAME = 'username',
}

const orderByColumns = {
  'email': '`u`.`email`',
  'first-name': '`u`.`firstName`',
  'last-name': '`u`.`lastName`',
  'created': '`u`.`created`',
  'last-activity': '`u`.`lastActivity`',
  'username': '`u`.`username`',
};