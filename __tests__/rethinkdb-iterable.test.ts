/// <reference types="jest" />

import rethinkdb, { Connection } from "rethinkdb";

import RethinkdbIterable from "..";
import _assert from "assert";

function assert(val: any, msg: string): asserts val {
  _assert(val, msg);
}

describe("RethinkdbIterable", () => {
  let index = 0;
  const ctx: {
    conn: Connection | null;
    db: string;
    intervalId: NodeJS.Timeout | null;
    table: string;
  } = {
    conn: null,
    db: "rethinkdb_iterator_test",
    intervalId: null,
    table: "rethinkdb_iterator_test",
  };

  beforeEach(async () => {
    ctx.conn = await rethinkdb.connect({
      host: "localhost",
      db: "",
    });
    await rethinkdb
      .dbCreate(ctx.db)
      .run(ctx.conn)
      .catch((err) => {
        if (/exists/.test(err.message)) return;
      });
    await rethinkdb
      .db(ctx.db)
      .tableCreate(ctx.table)
      .run(ctx.conn)
      .catch((err) => {
        if (/exists/.test(err.message)) return;
      });
    await rethinkdb
      .db(ctx.db)
      .table(ctx.table)
      .indexCreate("value", rethinkdb.row("value"))
      .run(ctx.conn)
      .catch((err) => {
        if (/exists/.test(err.message)) return;
      });
    await rethinkdb
      .db(ctx.db)
      .table(ctx.table)
      .indexWait("value")
      .run(ctx.conn);
  });
  afterEach(async () => {
    if (ctx.conn) {
      await rethinkdb
        .dbDrop(ctx.db)
        .run(ctx.conn)
        .catch((err) => {
          if (/exists/.test(err.message)) return;
        });
      await rethinkdb
        .db(ctx.db)
        .tableDrop(ctx.table)
        .run(ctx.conn)
        .catch((err) => {
          if (/exists/.test(err.message)) return;
        });
      await ctx.conn.close();
    }
  });

  describe("rows being created in table on interval", () => {
    const activePromises = new Set();
    beforeEach(() => {
      assert(ctx.conn != null, "connection is missing");
      const conn = ctx.conn;
      // insert new rows on interval
      ctx.intervalId = setInterval(() => {
        const p = rethinkdb
          .db(ctx.db)
          .table(ctx.table)
          .insert({
            id: index++,
          })
          .run(conn)
          .finally(() => activePromises.delete(p));
        activePromises.add(p);
      }, 100);
    });
    afterEach(async () => {
      if (ctx.intervalId) clearInterval(ctx.intervalId);
      await Promise.all(Array.from(activePromises));
    });

    it("should create an async iterable, iterate through it, and eventually close the cursor", async () => {
      assert(ctx.conn != null, "connection is missing");
      const conn = ctx.conn;
      const cursor = await rethinkdb
        .db(ctx.db)
        .table(ctx.table)
        .changes()
        .run(conn);
      const iterator = new RethinkdbIterable(cursor);

      let done = false;
      setTimeout(() => {
        done = true;
      }, 300);

      const results = [];
      for await (const val of iterator) {
        results.push(val);
        if (done) break;
      }
      expect(results).toMatchInlineSnapshot(`
        Array [
          Object {
            "new_val": Object {
              "id": 0,
            },
            "old_val": null,
          },
          Object {
            "new_val": Object {
              "id": 1,
            },
            "old_val": null,
          },
          Object {
            "new_val": Object {
              "id": 2,
            },
            "old_val": null,
          },
        ]
      `);
    });
  });

  describe("one row exists", () => {
    const indexValue = "indexValue";
    beforeEach(async () => {
      assert(ctx.conn != null, "connection is missing");
      const conn = ctx.conn;
      // insert new rows on interval
      await rethinkdb
        .db(ctx.db)
        .table(ctx.table)
        .insert({
          id: index++,
          value: indexValue,
        })
        .run(conn);
      await rethinkdb
        .db(ctx.db)
        .table(ctx.table)
        .insert({
          id: index++,
          value: indexValue,
        })
        .run(conn);
      await rethinkdb
        .db(ctx.db)
        .table(ctx.table)
        .insert({
          id: index++,
          value: indexValue,
        })
        .run(conn);
    });
    afterEach(() => {
      if (ctx.intervalId) clearInterval(ctx.intervalId);
    });

    it("should create an async iterable that gets row and completes successfully", async () => {
      assert(ctx.conn != null, "connection is missing");
      const conn = ctx.conn;
      // @ts-ignore
      const cursor = await rethinkdb
        .db(ctx.db)
        .table(ctx.table)
        .getAll(indexValue, { index: "value" })
        .run(ctx.conn);
      const iterator = new RethinkdbIterable(cursor);
      const results = [];
      for await (const val of iterator) {
        results.push(val);
      }
      expect(results).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 4,
            "value": "indexValue",
          },
          Object {
            "id": 5,
            "value": "indexValue",
          },
          Object {
            "id": 3,
            "value": "indexValue",
          },
        ]
      `);
    });
  });
});

const toPromise = <R>(
  task: (cb: (err?: Error, val?: R) => void) => void
): Promise<R> => {
  return new Promise((resolve, reject) => {
    task((...args) => {
      const [err, val] = args;
      if (err != null) return void reject(err);
      if (args.length === 2) return void resolve(val);
      resolve();
    });
  });
};

export default toPromise;
