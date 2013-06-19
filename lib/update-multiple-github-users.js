'use strict';

var updateRepos = require('./update-github-repos')
  , EventEmitter = require('events').EventEmitter

var update = module.exports = function (db, users, opts) {
  var events = new EventEmitter()
    , hour = 60 * 60 * 1000;

  opts = opts || {};
  var timeout       = typeof opts.timeout       === 'undefined' ? hour  : opts.timeout
    , minRemaining  = typeof opts.minRemaining  === 'undefined' ? 400   : opts.minRemaining;

  function updateUsers() {
    var nextUser = users.shift();
    if (!nextUser) return events.emit('end');

    updateRepos(db, nextUser, function (err, res) {
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
        events.emit('pause', timeout);
        return setTimeout(updateUsers, timeout);
      }

      setTimeout(updateUsers);
    });
  }

  setTimeout(updateUsers);
  return events;
};
