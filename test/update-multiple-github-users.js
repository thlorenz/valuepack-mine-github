'use strict';
/*jshint asi: true */

var test =  require('tap').test
  , proxyquire =  require('proxyquire')

test('\nupdating two users, no errors, lots remaining', function (t) {

  function updateRepos(db, user, cb) {
    setTimeout(cb.bind(null, null, { user: user, remaining: 999, modifieds: 'the modifieds' }), 5)
  }
  
  var updateMultiple = proxyquire(
      '../lib/update-multiple-github-users'
    , { './update-github-repos': updateRepos }
  )

  var stored = []
  updateMultiple('the db', [ 'uno', 'dos' ])
    .on('error', t.fail.bind(null)) 
    .on('pause', t.fail.bind(null, 'should not pause'))
    .on('stored', [].push.bind(stored))
    .on('end', function () {
      t.deepEqual(stored.map(function (x) { return x.user }), [ 'uno', 'dos' ], 'stores both users')
      t.end()
    });
})

test('\nupdating two users, first errors, lots remaining', function (t) {

  function updateRepos(db, user, cb) {
    var err = user !== 'uno' ? null : new Error(user)
      , res = err ? null : { user: user, remaining: 999, modifieds: 'the modifieds' }

    setTimeout(cb.bind(null, err, res), 5)
  }
  
  var updateMultiple = proxyquire(
      '../lib/update-multiple-github-users'
    , { './update-github-repos': updateRepos }
  )

  t.plan(2)
  var stored = []
  updateMultiple('the db', [ 'uno', 'dos' ])
    .on('pause', t.fail.bind(null, 'should not pause'))
    .on('stored', [].push.bind(stored))
    .on('error', function (err) {
      t.equal(err.message, 'uno', 'emits error for first user')
    })
    .on('end', function () {
      t.deepEqual(stored.map(function (x) { return x.user }), [ 'dos' ], 'stores only second user ')
    });
})

test('\nupdating two users, no errors, not enough remaining', function (t) {

  function updateRepos(db, user, cb) {
    var remaining = user === 'uno' ? 10 : 100;
    setTimeout(cb.bind(null, null, { user: user, remaining: remaining, modifieds: 'the modifieds' }), 5)
  }
  
  var updateMultiple = proxyquire(
      '../lib/update-multiple-github-users'
    , { './update-github-repos': updateRepos }
  )

  t.plan(2)
  var stored = []
  updateMultiple('the db', [ 'uno', 'dos' ], { timeout: 100, minRemaining: 20 })
    .on('error', t.fail.bind(null)) 
    .on('stored', [].push.bind(stored))
    .on('pause', function () {
      t.deepEqual(stored.map(function (x) { return x.user }), [ 'uno' ], 'pauses after updating first user')
    })
    .on('end', function () {
      t.deepEqual(stored.map(function (x) { return x.user }), [ 'uno', 'dos' ], 'stores both users')
    })
})
