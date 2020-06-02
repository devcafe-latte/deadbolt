import { PageResult, Page } from '../model/Page';

describe("Page", () => {
  it("Tests lastPage", () => {
    const result: PageResult = {
      items: [],
      currentPage: 0,
      totalItems: 50,
      perPage: 5,
    }

    let page: Page<any>;

    page = new Page(result);
    expect(page.lastPage).toBe(9);

    result.totalItems = 49;
    page = new Page(result);
    expect(page.lastPage).toBe(9);

    result.totalItems = 51;
    page = new Page(result);
    expect(page.lastPage).toBe(10);

    result.totalItems = 0;
    page = new Page(result);
    expect(page.lastPage).toBe(0);
  });
});