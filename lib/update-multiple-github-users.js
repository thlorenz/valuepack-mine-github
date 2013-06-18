'use strict';

var updateRepos = require('./update-github-repos')
  , EventEmitter = require('events').EventEmitter
  , minRemaining = 400;

var update = module.exports = function (db, users) {
  var events = new EventEmitter()
    , timeout = 60 * 60 * 1000       // 1 hour

  // TODO: for now process one user at a time 
  //       increase concurrency later

  function updateUsers() {
    var nextUser = users.shift();
    if (!nextUser) return events.emit('end');

    updateRepos(db, nextUser, function (err, res) {
      if (err) {
        events.emit('error', err);
        return process.nextTick(updateUsers);
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

      process.nextTick(updateUsers);
    });
  }

  process.nextTick(updateUsers);
  return events;
};
