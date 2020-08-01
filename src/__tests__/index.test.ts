import { get } from 'env-var'
import { ignoreMessage } from 'ignore-errors'
import r from 'rethinkdb'
import rethinkdbGen from '../index'

// @ts-ignore
process.env.BLUEBIRD_DEBUG = 0
jest.setTimeout(30 * 1000)

describe('rethinkdb-generator', () => {
  let conn
  beforeAll(async () => {
    conn = await r.connect({
      host: get('RETHINKDB_HOST').default('localhost').asString(),
    })
    await r
      .dbCreate('test')
      .run(conn)
      .catch(ignoreMessage(/exists/))
    await r
      .db('test')
      .tableCreate('test')
      .run(conn)
      .catch(ignoreMessage(/exists/))
    await r
      .db('test')
      .table('test')
      .insert([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 },
        { id: 9 },
      ])
      .run(conn)
      .catch(ignoreMessage(/exists/))
  })
  afterAll(async () => {
    await r.dbDrop('test').run(conn)
    await conn.close()
  })

  it('should get one row using generator.next', async () => {
    let generator
    let cursor
    try {
      cursor = await r.db('test').table('test').run(conn)
      jest.spyOn(cursor, 'close')
      jest.spyOn(cursor, 'next')
      generator = rethinkdbGen<{ id: number }>(cursor)
      const { value: row } = await generator.next()
      expect(cursor.next).toHaveBeenCalledTimes(1)
      expect(typeof (row && row.id)).toBe('number')
    } catch (err) {
      throw err
    } finally {
      await generator?.return()
      expect(cursor.close).toHaveBeenCalled()
    }
  })

  it('should get error if generator.next rejects', async () => {
    let generator
    let cursor
    try {
      cursor = await r.db('test').table('test').run(conn)
      const err = new Error('boom')
      jest.spyOn(cursor, 'close')
      jest.spyOn(cursor, 'next').mockImplementation(() => Promise.reject(err))
      generator = rethinkdbGen<{ id: number }>(cursor)
      expect(generator.next()).rejects.toThrow(err)
      expect(cursor.close).toHaveBeenCalled()
    } catch (err) {
      throw err
    } finally {
      await generator?.return()
      expect(cursor.close).toHaveBeenCalled()
    }
  })

  it('should get all rows using for-await-of"', async () => {
    const cursor = await r.db('test').table('test').run(conn)
    jest.spyOn(cursor, 'close')
    const generator = rethinkdbGen<{ id: number }>(cursor)
    const rows = []
    for await (let row of generator) {
      rows.push(row.id)
    }
    expect(cursor.close).toHaveBeenCalled()
    expect(rows.sort()).toMatchInlineSnapshot(`
      Array [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
      ]
    `)
  })

  it('should get first row using for-await-of"', async () => {
    const cursor = await r.db('test').table('test').run(conn)
    jest.spyOn(cursor, 'close')
    const generator = rethinkdbGen<{ id: number }>(cursor)
    const rows = []
    for await (let row of generator) {
      rows.push(row.id)
      break
    }
    expect(cursor.close).toHaveBeenCalled()
    expect(rows.length).toBe(1)
    expect(typeof rows[0]).toBe('number')
  })

  it('should get error if for-await-of rejects', async () => {
    let generator
    let cursor
    try {
      cursor = await r.db('test').table('test').run(conn)
      const err = new Error('boom')
      jest.spyOn(cursor, 'close')
      jest.spyOn(cursor, 'next').mockImplementation(() => Promise.reject(err))
      generator = rethinkdbGen<{ id: number }>(cursor)
      await expect(
        (async () => {
          const rows = []
          for await (let row of generator) {
            rows.push(row.id)
          }
        })(),
      ).rejects.toThrow(err)
      expect(cursor.close).toHaveBeenCalled()
    } catch (err) {
      throw err
    } finally {
      await generator?.return()
      expect(cursor.close).toHaveBeenCalled()
    }
  })
})
