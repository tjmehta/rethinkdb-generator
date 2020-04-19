import { Cursor } from 'rethinkdb'

export default class RethinkdbIterable<Value> {
  private cursor: Cursor
  private closed: boolean
  constructor(cursor: Cursor) {
    this.cursor = cursor
    this.closed = false
  }
  [Symbol.asyncIterator]() {
    const iterator: {
      next: () => Promise<{
        value: Value | undefined
        done: boolean
      }>
      return: () => Promise<{
        value: undefined
        done: true
      }>
    } = {
      next: async () => {
        try {
          const value = await toPromise<Value>((cb) => this.cursor.next(cb))
          return {
            done: false,
            value,
          }
        } catch (err) {
          if (/closed/.test(err.message)) {
            this.closed = true
            return iterator.return()
          }
          if (/No more rows/.test(err.message)) {
            return iterator.return()
          }
          throw err
        }
      },
      return: async () => {
        if (this.closed)
          return {
            done: true,
            value: undefined,
          }
        this.closed = true
        await this.cursor.close()
        return {
          done: true,
          value: undefined,
        }
      },
    }
    return iterator
  }
}

const toPromise = <R>(
  task: (cb: (err: Error, val?: R) => void) => void
): Promise<R> => {
  return new Promise((resolve, reject) => {
    task((...args) => {
      const [err, val] = args
      if (err != null) return void reject(err)
      if (args.length === 2) return void resolve(val)
      resolve()
    })
  })
}
