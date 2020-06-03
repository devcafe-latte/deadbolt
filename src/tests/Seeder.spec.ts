import { Seeder } from '../model/Seeder';
import { Settings } from '../model/Settings';
import { TestHelper } from './TestHelper';

describe("Seeder", () => {

  beforeEach(() => {
    TestHelper.setTestEnv();
  });

  it("Tries seeding", async(done) => {
    const settings = new Settings();
    settings.dbName = "deadbolt_seed_test_" + Math.floor(Math.random() * 100000);
    console.log("Seeding DB: " + settings.dbName);

    const seeder: any = new Seeder(settings);

    expect(await seeder.dbExists(settings.dbName)).toBe(false);
    await seeder.seed();
    expect(await seeder.dbExists(settings.dbName)).toBe(true);
    
    done();
  });
});