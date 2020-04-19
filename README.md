# rethinkdb-iterable

Convert a rethinkdb cursor into an async iterable

# Installation

```js
npm i --save rethinkdb-iterable
```

# Usage

#### Example: Get all rows from a rethinkdb selection query

```js
import r from 'rethinkdb'
import RethinkdbIterable from 'rethinkdb-iterable'

const conn = await r.connect();
const cursor = await r.table('test').getAll('hello', { index: 'message' }).run(conn)
const iterable = new RethinkdbIterable(cursor)

const rows = []
for await (const row in iterable) {
  rows.push(row)
}

console.log(rows) // all rows matching { message: 'hello' }
```

#### Example: Get a limited number of rows from a rethinkdb selection query

```js
import r from 'rethinkdb'
import RethinkdbIterable from 'rethinkdb-iterable'

const conn = await r.connect();
const cursor = await r.table('test').getAll('hello', { index: 'message' }).run(conn)
const iterable = new RethinkdbIterable(cursor)

const rows = []
const count = 10
for await (const row in iterable) {
  rows.push(row)
  if (rows.length >= 10) break; // this will not only break the loop but also close the cursor
}

console.log(rows)
// if 10 rows exists:
// 10 rows matching { message: 'hello' }
// if 5 rows exists:
// 5 rows matching { message: 'hello' }
```

#### Example: Subscribe to results from a rethinkdb changes query

```js
import r from 'rethinkdb'
import RethinkdbIterable from 'rethinkdb-iterable'
import fooEventEmitter from './foo_event_emitter'

const conn = await r.connect();
const cursor = await r.table('test').changes().run(conn)
const iterable = new RethinkdbIterable(cursor)

const results = []
const count = 10

for await (const result in iterable) {
  results.push(result) // { old_val: ..., new_val: ... }
  if (results.length >= 10) break; // will unsubscribe from changes query after receiving 10 results
}
```

#### Example: Subscribe and unsubscribe from a rethinkdb changes query using an iterator

```js
import r from 'rethinkdb'
import RethinkdbIterable from 'rethinkdb-iterable'
import fooEventEmitter from './foo_event_emitter'

const conn = await r.connect()
const cursor = await r.table('test').changes().run(conn)
const iterable = new RethinkdbIterable(cursor)
const iterator = iterable[Symbol.asyncIterator]()

const result1 = await iterator.next() // wait until it receives the first change result, { old_val: ..., new_val: ... }
const result2 = await iterator.next() // wait until it receives the second change result, { old_val: ..., new_val: ... }
await iterator.return() // close the cursor and unsubscribe from the changes query
```

# License

MIT
