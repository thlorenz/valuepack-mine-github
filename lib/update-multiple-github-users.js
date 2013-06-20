'use strict';

var updateRepos = require('./update-github-repos')
  , EventEmitter = require('events').EventEmitter

var update = module.exports = function (db, users, opts) {
  var events = new EventEmitter()
    , hour = 60 * 60 * 1000

  opts = opts || {};
  var timeout       = typeof opts.timeout       === 'undefined' ? hour  : opts.timeout
    , minRemaining  = typeof opts.minRemaining  === 'undefined' ? 400   : opts.minRemaining
    , concurrency   = typeof opts.concurrency   === 'undefined' ? 20    : opts.concurrency
    , active = 0
    , ended
    , paused;

  function updateUsers() {

    var nextUser = users.shift();
    if (!nextUser) { 
      if(active || ended) return;
      ended = true;

      return events.emit('end');
    }

    active++;

    // add more requests in case we are operating below concurrency
    if (active < concurrency) setTimeout(updateUsers);
    
    updateRepos(db, nextUser, function (err, res) {
      active--;
      if (err) {
        events.emit('error', err);
        return setTimeout(updateUsers);
      }

      events.emit(
          'stored'
        , { user: nextUser
          , remaining: res.remaining
          , modifieds: res.modifieds 
          }
      );

      if (res.remaining < minRemaining) {
        if (paused) return;
        events.emit('pause', timeout);
        return setTimeout(function () { paused = false; updateUsers(); }, timeout);
      }

      setTimeout(updateUsers);
    });
  }

  setTimeout(updateUsers);
  return events;
};
