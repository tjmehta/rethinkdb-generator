import { Cursor } from 'rethinkdb'
import abortable from 'abortable-generator'

export interface AsyncGen<Next, Return> extends AsyncGenerator<Next, Return> {
  return(
    value?: Return | PromiseLike<Return>,
  ): Promise<IteratorResult<Next, Return>>
}

export default function rethinkdbGen<Row extends object>(
  cursor: Cursor,
): AsyncGen<Row, undefined> {
  const rows = abortable<Row>(async function* (raceAbort) {
    try {
      while (true) {
        // reject is necessary or rethinkdb results in unhandled rejection
        yield raceAbort(cursor.next().catch((err) => Promise.reject(err)))
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      if (/no more rows/i.test(err.message)) return
      throw err
    } finally {
      try {
        await cursor.close()
      } finally {
      }
    }
  })

  return rows()
}
