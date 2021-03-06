/* global describe, it, expect */
import {Loki} from "../../../loki/src/loki";
import {MemoryStorage} from "../../src/memory_storage";

describe("testing memory storage", function () {

  interface Name {
    name: string;
  }

  beforeAll(() => {
    MemoryStorage.register();
  });

  afterAll(() => {
    MemoryStorage.deregister();
  });

  it("LokiMemoryStorage", function (done) {
    const db = new Loki("myTestApp");
    const adapter = {adapter: new MemoryStorage()};
    db.initializePersistence(adapter)
      .then(() => {
        db.addCollection<Name>("myColl").insert({name: "Hello World"});
        return db.saveDatabase();
      })
      .then(() => {
        const db2 = new Loki("myTestApp");
        return db2.initializePersistence(adapter)
          .then(() => {
            return db2.loadDatabase();
          }).then(() => {
            expect(db2.getCollection<Name>("myColl").find()[0].name).toEqual("Hello World");
          });
      })
      .then(() => {
        const db2 = new Loki("myTestApp");
        return db2.initializePersistence(adapter)
          .then(() => {
            return db2.loadDatabase();
          }).then(() => {
            expect(db2.getCollection<Name>("myColl").find()[0].name).toEqual("Hello World");
          });
      })
      .then(() => {
        const db3 = new Loki("other");
        return db3.initializePersistence(adapter)
          .then(() => {
            return db3.loadDatabase();
          }).then(() => {
            expect(false).toEqual(true);
          }, () => {
            expect(true).toEqual(true);
          });
      })
      .then(() => {
        return db.deleteDatabase();
      })
      .then(() => {
        return db.loadDatabase()
          .then(() => {
            expect(db.getCollection<Name>("myColl").find()[0].name).toEqual("Hello World");
            expect(false).toEqual(true);
            done();
          }, () => {
            expect(true).toEqual(true);
            done();
          });
      });
  });
});
