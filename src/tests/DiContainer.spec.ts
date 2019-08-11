import container from '../model/DiContainer';
import { TestHelper } from './TestHelper';

describe('Dependency Container tests', () => {
  let th: TestHelper;
  beforeEach(async () => {
    th = await TestHelper.new();
  });  

  it('Initiating', async () => {
    await container.ready();

    expect(container.um).toBeDefined();
    expect(container.db).toBeDefined();

    await container.db.ping();
    expect(true).toBe(true);
  }); 


});