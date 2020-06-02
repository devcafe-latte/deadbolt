import { Serializer } from './Serializer';


export class Page<T> {
  items: T[];
  currentPage: number;
  lastPage: number;
  private totalItems?: number;
  private perPage?: number;

  constructor(result: PageResult, type?: any) {
    Object.assign(this, result);

    if (type && typeof type['deserialize'] === "function") {
      this.items = this.items.map(i => type.deserialize(i));
    }

    if (this.totalItems !== undefined && this.perPage !== undefined) this.setLastPage(result.totalItems);
  }

  private setLastPage(total: number) {
    if (this.perPage === 0) {
      this.lastPage = 0;
      return;
    }
    this.lastPage = total ? Math.ceil(total / this.perPage) - 1 : 0;
  }

  serialize() {
    return {
      currentPage: this.currentPage,
      lastPage: this.lastPage,
      items: Serializer.serialize(this.items),
    }
  }
}

export interface PageResult {
  items: any[],
  currentPage: number;
  totalItems: number;
  perPage: number;
}

export interface BaseSearchCriteria {
  currentPage: number;
  perPage: number;
}