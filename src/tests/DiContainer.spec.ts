import container from '../model/DiContainer';
import { TestHelper } from './TestHelper';

describe('Dependency Container tests', () => {
  let th: TestHelper;
  beforeEach(async () => {
    th = await TestHelper.new();
  });

  afterEach(async () => {
    await th.shutdown();
  });

  it('Initiating', async () => {
    expect(container.um).toBeDefined();
    expect(container.db).toBeDefined();

    try {
      await container.db.ping();
    } catch (error) {
      throw error;
    }
    
    expect(true).toBe(true);
  });


});