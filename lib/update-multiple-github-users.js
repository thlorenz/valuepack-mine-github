'use strict';

var updateRepos  =  require('./update-github-repos')
  , log          =  require('valuepack-core/util/log')
  , EventEmitter =  require('events').EventEmitter
  , calcWait     =  require('../lib/calc-wait')
  , setImmediate =  setImmediate || setTimeout // node 0.8 compat


var update = module.exports = function (db, users, opts) {
  var events = new EventEmitter()
    , hour = 60 * 60 * 1000
    , totalUsers = users.length

  opts = opts || {};

 // wait a minute longer by default to be safe
  var timeout       = typeof opts.timeout      === 'undefined' ? hour + 60000 : opts.timeout
    , minRemaining  = typeof opts.minRemaining  === 'undefined' ? 300   : opts.minRemaining
    , concurrency   = typeof opts.concurrency   === 'undefined' ? 20    : opts.concurrency
    , active = 0
    , smallestRemaining
    , ended
    , paused
    , started;

  function start() {
    started = Date.now();
    paused = false;
    smallestRemaining = 5000;
    updateUsers();
  }

  function updateUsers() {

    var nextUser = users.shift();
    log.info('update-multiple-github-users', 'updating: ', nextUser);

    if (!nextUser) {
      if(active || ended) return;
      ended = true;

      return events.emit('end');
    }

    active++;

    // add more requests in case we are operating below concurrency
    if (active < concurrency && !paused) setTimeout(updateUsers);

    updateRepos(db, nextUser, function (err, res) {
      active--;
      if (err) {
        events.emit('error', err);
        return setTimeout(updateUsers);
      }
      
      // in case structuring and storing the response failed we just move on
      if (!res) return setTimeout(updateUsers);

      events.emit(
          'stored'
        , { user: nextUser
          , remaining: res.remaining
          , modifieds: res.modifieds
          }
      );

      smallestRemaining = Math.min(smallestRemaining, res.remaining);

      if (smallestRemaining < minRemaining) {
        if (paused) return;
        var wait = calcWait(started, timeout);
        events.emit('pause', wait);
        paused = true;
        log.info('update-multiple-github-users', 'Updated %d/%d users. Waiting %d ms (%d mins) to continue.', totalUsers - users.length, users.length, wait, wait / 60000);
        return setTimeout(start, wait);
      }

      setImmediate(updateUsers);
    });
  }

  setImmediate(start);
  return events;
};
