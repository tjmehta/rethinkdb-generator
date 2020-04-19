"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class RethinkdbIterable {
  constructor(cursor) {
    this.cursor = cursor;
    this.closed = false;
  }

  [Symbol.asyncIterator]() {
    const iterator = {
      next: async () => {
        try {
          const value = await toPromise(cb => this.cursor.next(cb));
          return {
            done: false,
            value
          };
        } catch (err) {
          if (/closed/.test(err.message)) {
            this.closed = true;
            return iterator.return();
          }

          if (/No more rows/.test(err.message)) {
            return iterator.return();
          }

          throw err;
        }
      },
      return: async () => {
        if (this.closed) return {
          done: true,
          value: undefined
        };
        this.closed = true;
        await this.cursor.close();
        return {
          done: true,
          value: undefined
        };
      }
    };
    return iterator;
  }

}

exports.default = RethinkdbIterable;

const toPromise = task => {
  return new Promise((resolve, reject) => {
    task((...args) => {
      const [err, val] = args;
      if (err != null) return void reject(err);
      if (args.length === 2) return void resolve(val);
      resolve();
    });
  });
};

