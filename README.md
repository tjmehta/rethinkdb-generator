# rethinkdb-generator

Create an generator (iterable) from a rethinkdb cursor

# Installation

```sh
npm i --save rethinkdb-generator
```

# Usage

#### Supports both ESM and CommonJS

```js
// esm
import rethinkdbGenerator from 'rethinkdb-generator'
// commonjs
const rethinkdbGenerator = require('rethinkdb-generator')
```

#### Example: create a generator from a rethinkdb cursor

```js
import getRows from 'rethinkdb-generator'
import r from 'rethinkdb'

const conn = r.connect()
const cursor = await r.db('test').table('test').run(conn)
const rows = getRows(cursor)

// use generator directly
const row = await rows.next() // get "next" row
await rows.return() // close cursor
```

#### Example: use rethinkdb generators with "for await .. of"

```js
import getRows from 'rethinkdb-generator'
import r from 'rethinkdb'

const conn = r.connect()
const cursor = await r.db('test').table('test').run(conn)
const rows = getRows(cursor)

// use generator w/ "for await .. of"
for await (let row of rows) {
  console.log(row)
}
// cursor will be closed after loop completes or breaks
```

# License

MIT
