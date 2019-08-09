import container from '../model/DiContainer';

describe('Dependency Container tests', () => {

  it('Initiating', async () => {
    await container.ready();

    expect(container.um).toBeDefined();
    expect(container.db).toBeDefined();

    await container.db.ping();
    expect(true).toBe(true);
  }); 


});