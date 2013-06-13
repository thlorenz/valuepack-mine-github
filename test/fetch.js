'use strict';

var test = require('tap').test
  , proxyquire = require('proxyquire')
  , options = { headers: { 'some': 'headers' }, startPage: 1, perPage: 100 }
  , lastModified = Date(5)
  , resource = 'repos'

function passThru(pages, cb) {
  cb(null, pages)
}


test('request all pages without error', function (t) {
  t.plan(4)

  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { 
            t.equal(start, 1, 'startPage included in request')   
            t.equal(per, 100, 'perPage included in request')
            t.ok(opts.json, 'json request')
            cb(null, 'handled pages') 
          }
      , './handle-pages': passThru
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.equal(res, 'handled pages', 'returns handled pages')
  })
})

test('request all pages causes error', function (t) {
  var error = new Error('boo')
  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { cb(new Error('boo')) }
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.ok(err, 'returns error')
    t.end()
  })
})
