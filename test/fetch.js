'use strict';

var test         =  require('tap').test
  , proxyquire   =  require('proxyquire')
  , options      =  { headers: { 'some': 'headers' }, startPage: 1, perPage: 100 }
  , lastModified =  Date(5)
  , resource     =  'repos'

function passThru(mixed, pages, cb) {
  cb(null, { body: pages, mixedModifieds: mixed })
}

test('\nrequest all pages without error', function (t) {
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
      , './handle-pages': passThru.bind(null, false)
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.equal(res.body, 'handled pages', 'returns handled pages')
  })
})

test('\nrequest all pages causes error', function (t) {
  t.plan(1)
  var error = new Error('boo')
  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { 
            cb(new Error('boo')) 
          }
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.ok(err, 'returns error')
  })
})

test('\nrequest all pages results in non-mixed modifieds', function (t) {
  t.plan(2)
  var requests = 0

  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { 
            requests++
            cb(null, 'handled pages') 
          }
      , './handle-pages': passThru.bind(null, false)
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.equal(res.body, 'handled pages', 'returns handled pages')
    t.equal(requests, 1, 'requests pages exactly once')
  })
})

test('\nrequest all pages results in mixed modifieds the first time', function (t) {
  t.plan(4)
  var requests = 0
  var lastModifieds = []

  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { 
            requests++
            lastModifieds.push(opts.headers['If-Modified-Since'])
            cb(null, 'handled pages') 
          }
      , './handle-pages': 
          function (pages, cb) {
            var mixed = requests === 1
            passThru(mixed, pages, cb) 
          }
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.equal(res.body, 'handled pages', 'returns handled pages')
    t.equal(requests, 2, 'requests pages exactly twice')
    t.deepEqual(lastModifieds[0], lastModified, 'first time with last modified passed')
    t.deepEqual(lastModifieds[1], new Date(0) , 'second time with minimum date as last modified')
  })
})

test('\nrequest all pages results in mixed modifieds twice', function (t) {
  t.plan(4)
  var requests = 0
  var lastModifieds = []

  var fetch = proxyquire(
      '../lib/fetch'
    , { 'request-all-pages': 
          function (opts, start, per, cb) { 
            requests++
            lastModifieds.push(opts.headers['If-Modified-Since'])
            cb(null, 'handled pages') 
          }
      , './handle-pages': 
          function (pages, cb) {
            var mixed = requests <= 2 
            passThru(mixed, pages, cb) 
          }
      }
  )

  fetch(options, lastModified, resource, function (err, res) {
    t.ok(err, 'returns error')
    t.equal(requests, 2, 'requests pages exactly twice')
    t.deepEqual(lastModifieds[0], lastModified, 'first time with last modified passed')
    t.deepEqual(lastModifieds[1], new Date(0) , 'second time with minimum date as last modified')
  })
})
