import abortable, { AsyncIterableIteratorWithDone } from 'abortable-generator'

import { Cursor } from 'rethinkdb'

export interface AsyncGen<Next, Return> extends AsyncGenerator<Next, Return> {
  return(
    value?: Return | PromiseLike<Return>,
  ): Promise<IteratorResult<Next, Return>>
}

export default function rethinkdbGen<Row extends object>(
  cursor: Cursor,
  signal?: AbortSignal,
): AsyncIterableIteratorWithDone<Row> {
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

  const iterable = rows(signal)

  if (signal?.aborted) {
    cursor.close()
    iterable.return()
  }

  return iterable
}
