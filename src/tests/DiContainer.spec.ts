import container from '../model/DiContainer';
import { TestHelper } from './TestHelper';
import { PoolConnection } from 'promise-mysql';

describe('Dependency Container tests', () => {
  let th: TestHelper;
  beforeEach(async () => {
    th = await TestHelper.new();
  });

  it('Initiating', async () => {
    await container.ready();

    expect(container.um).toBeDefined();
    expect(container.db).toBeDefined();

    let con: PoolConnection;

    try {
      con = await container.db.getConnection();
      con.ping();
      con.release();
    } catch (error) {
      if (con) con.release();
      throw error;
    }
    
    expect(true).toBe(true);
  });


});