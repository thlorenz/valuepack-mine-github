'use strict';

var test = require('tap').test
  , condense = require('../lib/condense-pages')

test('\ncondensing two pages with status code 200', function (t) {
  var uno = { headers: 'headers uno', statusCode: 200, body: 'body uno' }
    , dos = { headers: 'headers dos', statusCode: 200, body: 'body dos' }

  var c = condense([ uno, dos ])

  t.equal(c.headers, 'headers dos', 'headers of last page')
  t.equal(c.statusCode, 200, 'status code 200')
  t.deepEqual(c.body, [ 'body uno', 'body dos' ], 'both bodies')
  t.ok(c.modified, 'modified')
  t.notOk(c.mixedModifieds, 'no mixed modifieds')
  t.end()
})

test('\ncondensing two pages with status code 304', function (t) {
  var uno = { headers: 'headers uno', statusCode: 304, body: 'body uno' }
    , dos = { headers: 'headers dos', statusCode: 304, body: 'body dos' }

  var c = condense([ uno, dos ])

  t.equal(c.headers, 'headers dos', 'headers of last page')
  t.equal(c.statusCode, 304, 'status code 304')
  t.notOk(c.body, 'no body')
  t.notOk(c.modified, 'not modified')
  t.notOk(c.mixedModifieds, 'no mixed modifieds')
  t.end()
})

test('\ncondensing two pages first status code 304, second with status code 200', function (t) {
  var uno = { headers: 'headers uno', statusCode: 304, body: 'body uno' }
    , dos = { headers: 'headers dos', statusCode: 200, body: 'body dos' }

  var c = condense([ uno, dos ])

  t.equal(c.headers, 'headers dos', 'headers of last page')
  t.equal(c.statusCode, 200, 'status code 200')
  t.notOk(c.body, 'no body')
  t.notOk(c.modified, 'modified')
  t.ok(c.mixedModifieds, 'mixed modifieds')
  t.end()
})
