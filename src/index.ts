import { Cursor } from 'rethinkdb'

export default async function* rethinkdbGen<Row extends object>(
  cursor: Cursor,
): AsyncGenerator<Row, undefined> {
  try {
    while (true) {
      const row = await cursor.next().catch((err) => Promise.reject(err))
      yield row
    }
  } catch (err) {
    if (/no more rows/i.test(err.message)) return
    throw err
  } finally {
    try {
      await cursor.close()
    } finally {
    }
  }
}
